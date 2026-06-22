require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const OSS     = require('ali-oss');
const { rateLimit } = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3001;
const KEY  = process.env.DASHSCOPE_API_KEY;

// ── 数据目录 ──────────────────────────────────────────────
const DATA_DIR       = path.join(__dirname, 'data');
const AUDIO_DIR      = path.join(DATA_DIR, 'audio');
const TRANSCRIPTS_FILE = path.join(DATA_DIR, 'transcripts.jsonl');
const CONTACTS_FILE  = path.join(DATA_DIR, 'contacts.jsonl');
fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

function appendJsonl(file, obj) {
  fs.appendFileSync(file, JSON.stringify(obj) + '\n', 'utf8');
}

// 当前 session 的转录内容（单用户内测足够）
let sessionTranscripts = [];

if (!KEY) {
  console.error('\n❌  缺少 DASHSCOPE_API_KEY');
  console.error('   请在 .env 或服务器环境变量里设置 DASHSCOPE_API_KEY\n');
  process.exit(1);
}

const ossReady = Boolean(
  process.env.OSS_ACCESS_KEY_ID &&
  process.env.OSS_ACCESS_KEY_SECRET &&
  process.env.OSS_BUCKET &&
  process.env.OSS_REGION
);
const ossClient = ossReady ? new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
}) : null;

if (!ossReady) {
  console.warn('⚠️  OSS 未配置，音频会临时保存到本地 data/audio。');
}

// ── 文件上传：保存到 uploads/ ──────────────────────────────
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_, file, cb) => {
    const ok = /\.(mp3|m4a|mp4|wav|amr|ogg|aac|flac|webm)$/i.test(file.originalname);
    cb(ok ? null : new Error('不支持的格式'), ok);
  }
});

app.use(express.json());
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.static(__dirname)); // 提供 index.html

const minuteAudioLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_MINUTE || 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '录音太频繁了，请稍后再试' },
});

const dailyAudioLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_DAY || 50),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '今日录音次数已用完，请明日继续' },
});

const audioLimiters = [minuteAudioLimiter, dailyAudioLimiter];

function limitOnlyMultipartAudio(req, res, next) {
  if (!req.is('multipart/form-data')) return next();
  return minuteAudioLimiter(req, res, () => dailyAudioLimiter(req, res, next));
}

// ── 工具函数 ──────────────────────────────────────────────
async function callDashScope(body) {
  const res = await fetch(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`DashScope 返回非JSON响应 (${res.status}): ${text.slice(0, 200)}`); }
  if (!res.ok) throw new Error(data.message || data.code || `请求失败(${res.status})`);
  return data;
}

async function callQwen(messages, systemPrompt) {
  const res = await fetch(
    'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7
      })
    }
  );
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Qwen 返回非JSON响应 (${res.status}): ${text.slice(0, 200)}`); }
  if (!res.ok) throw new Error(data.error?.message || `请求失败(${res.status})`);
  return data.choices[0].message.content;
}

function safeFilePart(value) {
  return String(value || '').trim().replace(/[/\\:*?"<>|\s]+/g, '_').slice(0, 60);
}

async function saveAudioFile(file, sessionName, cardId) {
  const audioExt = path.extname(file.originalname) || '.webm';
  const safeSession = safeFilePart(sessionName);
  const audioName = `${safeSession ? safeSession + '_' : ''}card${cardId || 'unknown'}_${Date.now()}${audioExt}`;

  if (ossClient) {
    const date = new Date().toISOString().slice(0, 10);
    const objectName = `heirloom/audio/${date}/${audioName}`;
    await ossClient.put(objectName, file.path);
    return objectName;
  }

  const audioDest = path.join(AUDIO_DIR, audioName);
  fs.copyFileSync(file.path, audioDest);
  return audioName;
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); }
      catch { return { raw: line }; }
    });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/export', (req, res) => {
  res.json({
    transcripts: readJsonl(TRANSCRIPTS_FILE),
    contacts: readJsonl(CONTACTS_FILE),
  });
});

// ── 路由 1：转录音频 ──────────────────────────────────────
app.post('/api/transcribe', audioLimiters, upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传音频文件' });

  const filePath = req.file.path;
  try {
    const audioBuffer = fs.readFileSync(filePath);
    const base64 = audioBuffer.toString('base64');
    const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
    const fmt = (ext === 'm4a' || ext === 'mp4') ? 'mp4' : ext; // qwen-audio 用 mp4 表示 m4a/mp4

    const data = await callDashScope({
      model: 'qwen-audio-turbo',
      input: {
        messages: [{
          role: 'user',
          content: [
            { audio: `data:audio/${fmt};base64,${base64}` },
            { text: '直接输出说话人说的话，不要任何前缀、不要引号、不要解释。如有方言转为普通话书面语。' }
          ]
        }]
      }
    });

    let text = data?.output?.choices?.[0]?.message?.content?.[0]?.text;
    if (!text) throw new Error('转录结果为空，请检查音频文件');

    // 双保险：去掉模型可能残留的前缀和引号
    text = text.replace(/^这段音频[^，。\n]*[是：:]\s*/i, '').trim();
    text = text.replace(/^['''"""]([\s\S]+)['''"""]$/, '$1').trim();

    const cardId = req.body.cardId || null;
    const sessionName = req.body.personName || req.body.sessionName || '';
    const timestamp = new Date().toISOString();

    const audioFile = await saveAudioFile(req.file, sessionName, cardId);

    // 保存文字稿
    appendJsonl(TRANSCRIPTS_FILE, { cardId, sessionName, transcript: text, audioFile, savedAt: timestamp });

    // 累积到当前 session
    sessionTranscripts.push({ cardId, transcript: text });

    res.json({ transcript: text, cardId });
  } catch (err) {
    console.error('转录失败:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    fs.unlink(filePath, () => {}); // 删除临时文件
  }
});

// ── 路由 2：采访开始 — 获取第一个问题 ────────────────────
app.post('/api/interview-start', async (req, res) => {
  const { elderName, relation, module: mod, questionBank } = req.body;
  const isSelf = relation === '自己';
  const bank = Array.isArray(questionBank) ? questionBank.filter(Boolean) : [];
  const bankText = bank.length ? bank.map((q, i) => `${i + 1}. ${q}`).join('\n') : '';

  const persona = isSelf
    ? `这是${elderName || '本人'}在回顾自己的人生，板块是「${mod}」。你用「你」称呼对方，语气像一个温和、好奇、不评判的朋友。`
    : `你在帮${relation || '子女'}采访${elderName || '长辈'}，板块是「${mod}」。你用「您」称呼对方。`;

  const ask = bankText
    ? `下面是这个板块的问题库，请直接把第 1 题问出来（可以稍微口语化一点，但不要改变它问的核心事实），不超过40字，不要任何前缀：\n${bankText}`
    : `请生成这个板块最好的开场问题（不超过35字，直接问，不要前缀）。`;

  const systemPrompt = `${persona}

好问题的标准：
- 从具体的人、事、地点、时间、物件切入，不问抽象感受
- 一次只问一件事，不要复合问题
- 让人觉得"这个我能说，我想说"

铁律：不要把对方的话升华成"成长/觉知/共振/疗愈/能量"这类词，永远用大白话。

${ask}`;

  try {
    const question = await callQwen(
      [{ role: 'user', content: `请给出「${mod}」板块的第一个采访问题。` }],
      systemPrompt
    );
    res.json({ question: question.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 路由 3：采访轮次 — 转录 + 决定追问还是下一题 ────────
app.post('/api/interview-turn', limitOnlyMultipartAudio, upload.single('audio'), async (req, res) => {
  const { question, elderName, relation, module: mod, history: historyRaw, questionBank } = req.body;
  const history = JSON.parse(historyRaw || '[]');
  const isSelf = relation === '自己';
  const bankArr = Array.isArray(questionBank)
    ? questionBank.filter(Boolean)
    : (() => { try { return JSON.parse(questionBank || '[]'); } catch { return []; } })();
  const bankText = bankArr.length ? bankArr.map((q, i) => `${i + 1}. ${q}`).join('\n') : '';

  let transcript = req.body.preTranscript || '';
  if (!transcript && req.file) {
    try {
      const audioBuffer = fs.readFileSync(req.file.path);
      const base64 = audioBuffer.toString('base64');
      const ext = path.extname(req.file.originalname || 'recording.webm').slice(1) || 'webm';
      const fmt = ext === 'webm' ? 'wav' : (ext === 'm4a' ? 'mp4' : ext);

      const data = await callDashScope({
        model: 'qwen-audio-turbo',
        input: {
          messages: [{
            role: 'user',
            content: [
              { audio: `data:audio/${fmt};base64,${base64}` },
              { text: '直接输出说话人说的话，不要任何前缀、不要引号、不要解释。如有方言转为普通话书面语。' }
            ]
          }]
        }
      });
      let raw = data?.output?.choices?.[0]?.message?.content?.[0]?.text || '';
      raw = raw.replace(/^这段音频[^，。\n]*[是：:]\s*/i, '').trim();
      transcript = raw.replace(/^['''"""]([\s\S]+)['''"""]$/, '$1').trim();
    } catch (err) {
      console.error('转录失败:', err.message);
      return res.status(500).json({ error: `转录失败：${err.message}` });
    } finally {
      if (req.file) fs.unlink(req.file.path, () => {});
    }
  }

  if (!transcript.trim()) {
    return res.status(400).json({ error: '没有识别到语音，请重试' });
  }

  // 决定：追问 or 下一题 or 完成
  const persona = isSelf
    ? `你是传家宝的家脉访谈师，正在陪${elderName}回顾自己的人生，板块「${mod}」。用「你」称呼对方，语气温和、好奇、不评判。`
    : `你是传家宝的AI采访师，正在采访「${mod}」板块，采访对象是${elderName}（${relation}的长辈）。用「您」称呼。`;

  const bankRule = bankText
    ? `这个板块的问题库如下（按编号顺序问）：
${bankText}

怎么决定下一步：
- 看上面的对话历史，判断问题库里哪些已经问过了。默认问下一道"还没问过"的题（action: next），可以稍微口语化但不要改掉它问的核心事实。
- 只有当对方刚刚说到一个具体、有故事的细节、值得顺着挖一句时，才追问（action: followup）；追问完，下一轮回到问题库。
- 问题库里的题都问完了，返回 {"action":"complete","summary":"..."}。`
    : `规则：
- 默认直接进入下一个问题（action: next）
- 只有一种情况追问：对方提到了某个有趣/具体/意外的细节，顺着那个细节多问一句
- 超过8轮或话题充分了，返回 {"action":"complete","summary":"..."}`;

  const systemPrompt = `${persona}

${bankRule}

- 一次只问一件事，禁止复合问题
- 问具体的事物、地点、人物、时间，让人自然想接着说
- 不要把回答升华成"成长/觉知/共振/疗愈/能量"这类词

【硬性禁止——违反直接判不合格】：
问题里绝对不能包含：心情、感觉、感受、感想、体会、想法、心里、内心、情感、情绪、心态。
改成问事实："那条沟渠在哪？" 而不是 "看到沟渠是什么心情？"

返回 JSON（不要有其他文字）：
{
  "action": "followup" 或 "next" 或 "complete",
  "question": "下一个问题或追问（不超过40字，直接问，不要前缀）",
  "summary": "这段回答的一句话精华（用于传家册，15字以内）"
}`;

  try {
    const contextMessages = [
      ...history.slice(-6), // 只带最近6条上下文
      { role: 'user', content: `刚才的问题是：${question}\n\n${elderName}回答：${transcript}` }
    ];
    const raw = await callQwen(contextMessages, systemPrompt);
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let result;
    try { result = JSON.parse(jsonStr); }
    catch { result = { action: 'next', question: '您还有什么想说的吗？', summary: '' }; }

    const timestamp = new Date().toISOString();
    appendJsonl(TRANSCRIPTS_FILE, {
      route: 'interview-turn',
      module: mod || '',
      elderName: elderName || '',
      relation: relation || '',
      question: question || '',
      transcript,
      savedAt: timestamp,
    });

    res.json({ transcript, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 路由 4：跳过，获取下一题 ──────────────────────────────
app.post('/api/interview-next', async (req, res) => {
  const { elderName, relation, module: mod, history, skipped, questionBank } = req.body;
  const isSelf = relation === '自己';
  const you = isSelf ? '你' : '您';
  const bankArr = Array.isArray(questionBank) ? questionBank.filter(Boolean) : [];
  const bankText = bankArr.length ? bankArr.map((q, i) => `${i + 1}. ${q}`).join('\n') : '';

  const bankRule = bankText
    ? `这个板块的问题库：
${bankText}

看对话历史，跳过刚才那题（${skipped}），从问题库里挑下一道还没问过的题问出来（可稍微口语化，不超过40字，不要前缀）。问题库都问完了返回 {"question": null}。`
    : `请生成这个板块下一个好问题（不超过40字，直接问，用「${you}」称呼，不同于跳过的问题：${skipped}）。板块充分探讨过了返回 {"question": null}。`;

  const systemPrompt = `你是传家宝家脉访谈师，当前板块「${mod}」，刚才的问题被跳过了。

${bankRule}

不要问"心情/感觉/感受"，只问具体的人事地物时间。返回 JSON：{"question": "问题内容"} 或 {"question": null}`;

  try {
    const raw = await callQwen(
      [...(history || []).slice(-4), { role: 'user', content: '请给下一个问题。' }],
      systemPrompt
    );
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let result;
    try { result = JSON.parse(jsonStr); }
    catch { result = { question: null }; }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 路由 5：生成传家册章节 + 家脉图片段 ──────────────────
app.post('/api/generate', async (req, res) => {
  const { transcript, question, module: mod, elderName, relation } = req.body;
  if (!transcript) return res.status(400).json({ error: '请先转录音频' });

  const systemPrompt = `你是传家宝的内容整理师。你的工作是把长辈的口语录音，整理成有文学温度的传家册章节。

风格要求：
- 保留长辈的第一人称视角和语气，像"我"在说话
- 文字有温度，不煽情，不夸张
- 保留具体的细节（地名、人名、年代），这些细节让故事真实
- 适当润色口语，但不要失去原汁原味
- 每段200-400字为宜

同时，在整理章节之后，你需要识别这段话里隐含的家族特质：
- 世代天赋：这段话里体现了什么可能被遗传的能力或性格模式？
- 家族局限：有没有反复出现的卡点或模式？
- 与子女的连接：这个特质如何可能体现在下一代身上？

长辈姓名：${elderName || '长辈'}
子女与长辈的关系：${relation || '子女'}
${mod ? `所属板块：${mod}` : ''}
${question ? `采访问题：${question}` : ''}

请用 JSON 格式返回，格式如下：
{
  "chapter": "整理后的章节正文",
  "title": "这段故事的小标题（10字以内）",
  "gene": {
    "talent": "世代天赋（1-2句）",
    "limit": "家族局限（1-2句，如无明显信号则留空）",
    "connection": "与子女的连接（1-2句）"
  }
}`;

  try {
    const raw = await callQwen(
      [{ role: 'user', content: `以下是录音转录内容：\n\n${transcript}` }],
      systemPrompt
    );

    // 解析 JSON（兼容模型在 JSON 外包了 markdown 代码块的情况）
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch {
      result = { chapter: raw, title: '未命名章节', gene: {} };
    }

    res.json(result);
  } catch (err) {
    console.error('生成失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 路由 6：收集联系方式 ──────────────────────────────────
app.post('/api/contact', (req, res) => {
  const { personName, contact, cardCount } = req.body || {};
  if (!contact || !String(contact).trim()) {
    return res.status(400).json({ error: '请填写联系方式' });
  }

  const entry = {
    personName: personName || '',
    contact: String(contact).trim(),
    cardCount: Number(cardCount) || 0,
    receivedAt: new Date().toISOString(),
  };
  appendJsonl(CONTACTS_FILE, entry);
  console.log('联系方式已保存:', entry);

  sessionTranscripts = []; // 清空，准备下一次

  res.json({ ok: true });
});

// ── 启动 ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  传家宝工具已启动`);
  console.log(`   打开浏览器访问：http://localhost:${PORT}\n`);
});
