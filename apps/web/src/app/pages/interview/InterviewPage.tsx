import { useEffect, useMemo, useRef, useState } from "react";
import { apiBaseUrl } from "../../services/api";

type Message =
  | { id: string; type: "ai"; text: string }
  | { id: string; type: "user"; text: string }
  | { id: string; type: "hint"; text: string };

type TranscriptItem = {
  question: string;
  answer: string;
};

type ResultData = {
  chapter: string;
  gene?: {
    talent?: string;
    limit?: string;
    connection?: string;
  };
};

const moduleOptions = [
  "童年的家",
  "读书与成长",
  "青年与选择",
  "爱情那一章",
  "为人父母",
  "中年的重量",
  "现在的你",
  "一次出发",
  "一次转折",
  "一件骄傲的事",
  "给后代的话",
];

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function InterviewPage() {
  const [elderName, setElderName] = useState("");
  const [relation, setRelation] = useState("");
  const [moduleName, setModuleName] = useState(moduleOptions[0]);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [recordStatus, setRecordStatus] = useState("点击麦克风开始说话");
  const [recordStatusClass, setRecordStatusClass] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const elderInitial = elderName ? elderName[0] : "长";

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
  }, [messages, typingMessageId]);

  const historyPayload = useMemo(() => history, [history]);

  const addMessage = (message: Message) => {
    setMessages((value) => [...value, message]);
  };

  const typewriterMessage = async (type: "ai" | "user", text: string) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTypingMessageId(id);
    setMessages((value) => [...value, { id, type, text: "" }]);

    const msPerChar = type === "user" ? Math.min(60, Math.max(30, Math.round(3000 / Math.max(text.length, 1)))) : 45;
    for (let index = 0; index < text.length; index += 1) {
      await sleep(msPerChar);
      setMessages((value) =>
        value.map((item) => (item.id === id ? { ...item, text: text.slice(0, index + 1) } : item)),
      );
    }
    setTypingMessageId(null);
  };

  const startInterview = async () => {
    const trimmedName = elderName.trim();
    if (!trimmedName) {
      setNameError(true);
      return;
    }

    setNameError(false);
    setStarted(true);
    setElderName(trimmedName);
    setRelation(relation.trim() || "子女");
    setIsThinking(true);
    addMessage({ id: `thinking-${Date.now()}`, type: "hint", text: "AI 正在想第一个问题…" });

    try {
      const response = await fetch(`${apiBaseUrl}/api/interview-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderName: trimmedName,
          relation: relation.trim() || "子女",
          module: moduleName,
        }),
      });
      const data = (await response.json()) as { question?: string; error?: string };
      setMessages([]);
      if (data.error) throw new Error(data.error);
      if (data.question) {
        setCurrentQuestion(data.question);
        setHistory([{ role: "assistant", content: data.question }]);
        await typewriterMessage("ai", data.question);
      }
    } catch (error) {
      setMessages([]);
      addMessage({ id: `hint-${Date.now()}`, type: "hint", text: `⚠️ 获取问题失败：${error instanceof Error ? error.message : "未知错误"} — 请刷新页面重试。` });
    } finally {
      setIsThinking(false);
    }
  };

  const beginRecording = async () => {
    if (isThinking) return;

    if (!streamRef.current) {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        addMessage({ id: `hint-${Date.now()}`, type: "hint", text: "请允许麦克风访问权限" });
        return;
      }
    }

    audioChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/mp4";
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      void processRecording(mimeType);
    };
    recorder.start(100);
    setIsRecording(true);
    setRecordStatus("正在录音…点击停止");
    setRecordStatusClass("active");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordStatus("处理中…");
    setRecordStatusClass("thinking");
  };

  const processRecording = async (mimeType: string) => {
    setIsThinking(true);
    const blob = new Blob(audioChunksRef.current, { type: mimeType });

    try {
      setRecordStatus("转录中…");
      const audioForm = new FormData();
      audioForm.append("audio", blob, "recording.webm");

      const transcribeResponse = await fetch(`${apiBaseUrl}/api/transcribe`, {
        method: "POST",
        body: audioForm,
      });
      const transcribeData = (await transcribeResponse.json()) as { transcript?: string; error?: string };
      if (transcribeData.error || !transcribeData.transcript) {
        throw new Error(transcribeData.error ?? "转录失败");
      }

      const transcriptText = transcribeData.transcript;
      setHistory((value) => [...value, { role: "user", content: transcriptText }]);
      setTranscript((value) => [...value, { question: currentQuestion, answer: transcriptText }]);
      setQuestionCount((value) => value + 1);

      setRecordStatus("AI 思考中…");
      const decidePromise = fetch(`${apiBaseUrl}/api/interview-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preTranscript: transcriptText,
          question: currentQuestion,
          elderName,
          relation,
          module: moduleName,
          history: JSON.stringify([...historyPayload, { role: "user", content: transcriptText }]),
        }),
      }).then(async (response) => response.json() as Promise<{ action?: string; question?: string; summary?: string; error?: string }>);

      await typewriterMessage("user", transcriptText);

      const decision = await decidePromise;
      if (decision.error) throw new Error(decision.error);

      await sleep(300);

      if (decision.action === "followup" && decision.question) {
        setCurrentQuestion(decision.question);
        setHistory((value) => [...value, { role: "assistant", content: decision.question! }]);
        await typewriterMessage("ai", decision.question);
      } else if (decision.action === "next" && decision.question) {
        if (decision.summary) addMessage({ id: `hint-${Date.now()}`, type: "hint", text: decision.summary });
        await sleep(300);
        setCurrentQuestion(decision.question);
        setHistory((value) => [...value, { role: "assistant", content: decision.question! }]);
        await typewriterMessage("ai", decision.question);
      } else if (decision.action === "complete") {
        addMessage({ id: `hint-${Date.now()}`, type: "hint", text: "这个板块的问题已经问完了。" });
        await finishInterview();
        return;
      }

      setRecordStatus("点击麦克风开始说话");
      setRecordStatusClass("");
    } catch (error) {
      addMessage({ id: `hint-${Date.now()}`, type: "hint", text: `出错了：${error instanceof Error ? error.message : "未知错误"}` });
      setRecordStatus("点击麦克风开始说话");
      setRecordStatusClass("");
    } finally {
      setIsThinking(false);
    }
  };

  const skipQuestion = async () => {
    if (isThinking || isRecording) return;
    addMessage({ id: `hint-${Date.now()}`, type: "hint", text: "跳过了这个问题" });
    setIsThinking(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/interview-next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          elderName,
          module: moduleName,
          history,
          skipped: currentQuestion,
        }),
      });
      const data = (await response.json()) as { question?: string; error?: string };
      if (data.error) throw new Error(data.error);
      if (data.question) {
        setCurrentQuestion(data.question);
        setHistory((value) => [...value, { role: "assistant", content: data.question! }]);
        addMessage({ id: `ai-${Date.now()}`, type: "ai", text: data.question });
      } else {
        addMessage({ id: `hint-${Date.now()}`, type: "hint", text: "已经问完了所有问题。" });
        await finishInterview();
      }
    } catch (error) {
      addMessage({ id: `hint-${Date.now()}`, type: "hint", text: `出错了：${error instanceof Error ? error.message : "未知错误"}` });
    } finally {
      setIsThinking(false);
      setRecordStatus("点击麦克风开始说话");
      setRecordStatusClass("");
    }
  };

  const replayQuestion = () => {
    if (currentQuestion) {
      addMessage({ id: `hint-${Date.now()}`, type: "hint", text: "↑ 重新看上面的问题" });
    }
  };

  const finishInterview = async () => {
    if (transcript.length === 0) {
      addMessage({ id: `hint-${Date.now()}`, type: "hint", text: "还没有录制任何内容，先说几句吧。" });
      return;
    }

    addMessage({ id: `hint-${Date.now()}`, type: "hint", text: "正在为你生成传家册章节和家脉图…" });
    setRecordStatus("生成中…");
    setRecordStatusClass("thinking");

    try {
      const response = await fetch(`${apiBaseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.map((item) => `问：${item.question}\n答：${item.answer}`).join("\n\n"),
          module: moduleName,
          elderName,
          relation,
        }),
      });
      const data = (await response.json()) as ResultData & { error?: string };
      if (data.error) throw new Error(data.error);
      setResultData(data);
      setShowResult(true);
    } catch (error) {
      addMessage({ id: `hint-${Date.now()}`, type: "hint", text: `生成失败：${error instanceof Error ? error.message : "未知错误"}` });
      setRecordStatus("点击麦克风开始说话");
      setRecordStatusClass("");
    }
  };

  const copyResult = async () => {
    if (!resultData) return;
    const gene = resultData.gene;
    const geneText = [
      gene?.talent ? `世代天赋\n${gene.talent}` : "",
      gene?.limit ? `家族局限\n${gene.limit}` : "",
      gene?.connection ? `与子女的连接\n${gene.connection}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    await navigator.clipboard.writeText(`【传家册章节 · ${elderName} · ${moduleName}】\n\n${resultData.chapter ?? ""}\n\n---\n\n【家脉图片段】\n${geneText}`);
  };

  const restartInterview = () => {
    window.location.reload();
  };

  return (
    <>
      <div className="interview-app" id="app">
        {!started ? (
          <div className="setup-screen">
            <div>
              <p className="interview-kicker">传家宝 · 采访</p>
              <h1 className="setup-title">开始之前，告诉我一些基本信息</h1>
              <p className="setup-sub setup-sub-spaced">AI会根据这些信息，引导采访的方向。</p>
            </div>

            <div className="field">
              <label>今天采访的是？</label>
              <input
                maxLength={10}
                onChange={(event) => {
                  setElderName(event.target.value);
                  if (nameError) setNameError(false);
                }}
                placeholder={nameError ? "请先填写长辈的名字或称呼" : "如：外公、爷爷、妈妈"}
                type="text"
                value={elderName}
              />
            </div>

            <div className="field">
              <label>你们的关系</label>
              <input maxLength={10} onChange={(event) => setRelation(event.target.value)} placeholder="如：外孙女、孙子、女儿" type="text" value={relation} />
            </div>

            <div className="field">
              <label>选择采访板块</label>
              <select onChange={(event) => setModuleName(event.target.value)} value={moduleName}>
                <optgroup label="时间维度">
                  <option value="童年的家">板块01 · 童年的家</option>
                  <option value="读书与成长">板块02 · 读书与成长</option>
                  <option value="青年与选择">板块03 · 青年与选择</option>
                  <option value="爱情那一章">板块04 · 爱情那一章</option>
                  <option value="为人父母">板块05 · 为人父母</option>
                  <option value="中年的重量">板块06 · 中年的重量</option>
                  <option value="现在的你">板块07 · 现在的你</option>
                </optgroup>
                <optgroup label="故事线维度">
                  <option value="一次出发">板块15 · 一次出发</option>
                  <option value="一次转折">板块16 · 一次转折</option>
                  <option value="一件骄傲的事">板块19 · 一件骄傲的事</option>
                  <option value="给后代的话">板块21 · 给后代的话</option>
                </optgroup>
              </select>
            </div>

            <button className="start-btn" onClick={() => void startInterview()} type="button">
              开始采访
            </button>
          </div>
        ) : (
          <div className="chat-screen">
            <div className="topbar">
              <div className="topbar-info">
                <span className="topbar-name">{elderName}</span>
                <span className="topbar-module">板块 · {moduleName}</span>
              </div>
              <button className="topbar-btn" onClick={() => void finishInterview()} title="结束采访，生成传家册" type="button">
                完成
              </button>
            </div>

            <div className="chat" ref={chatRef}>
              {messages.map((message) => (
                <div className={`bubble-row ${message.type === "user" ? "user" : "ai"}`} key={message.id}>
                  {message.type === "hint" ? (
                    <div className="bubble hint">{message.text}</div>
                  ) : message.type === "ai" ? (
                    <>
                      <div className="avatar ai-av">传</div>
                      <div className="bubble ai">{message.text}</div>
                    </>
                  ) : (
                    <>
                      <div className="bubble user">{message.text}</div>
                      <div className="avatar user-av">{elderInitial}</div>
                    </>
                  )}
                </div>
              ))}
              {isThinking && typingMessageId === null ? (
                <div className="bubble-row ai">
                  <div className="avatar ai-av">传</div>
                  <div className="thinking">
                    <div className="dot" />
                    <div className="dot" />
                    <div className="dot" />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="bottom">
              <div className={`waveform ${isRecording ? "active" : ""}`}>
                <div className="wave-bar" style={{ height: "8px" }} />
                <div className="wave-bar" style={{ height: "14px" }} />
                <div className="wave-bar" style={{ height: "18px" }} />
                <div className="wave-bar" style={{ height: "12px" }} />
                <div className="wave-bar" style={{ height: "20px" }} />
                <div className="wave-bar" style={{ height: "16px" }} />
                <div className="wave-bar" style={{ height: "10px" }} />
              </div>
              <div className={`record-status${recordStatusClass ? ` ${recordStatusClass}` : ""}`}>{recordStatus}</div>
              <div className="record-wrap">
                <button className="side-btn" onClick={() => void skipQuestion()} title="跳过这个问题" type="button">
                  <svg viewBox="0 0 24 24">
                    <polyline points="5 12 19 12" />
                    <polyline points="13 6 19 12 13 18" />
                  </svg>
                </button>
                <button className={`record-btn ${isRecording ? "recording" : ""} ${isThinking ? "disabled" : ""}`} onClick={() => (isRecording ? stopRecording() : void beginRecording())} type="button">
                  {!isRecording ? (
                    <svg viewBox="0 0 24 24">
                      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <rect height="14" rx="2" width="14" x="5" y="5" />
                    </svg>
                  )}
                </button>
                <button className="side-btn" onClick={replayQuestion} title="重播当前问题" type="button">
                  <svg viewBox="0 0 24 24">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showResult && resultData ? (
        <div className="result-overlay">
          <div className="result-inner">
            <h2 className="result-title">采访完成</h2>
            <p className="result-meta">
              {elderName} · {moduleName} · {questionCount}段问答
            </p>

            <p className="result-label">传家册章节</p>
            <div className="result-chapter">{resultData.chapter || ""}</div>

            <p className="result-label result-label-green">家脉图片段</p>
            <div className="result-gene">
              <p className="result-gene-kicker">AI提取 · 家族基因信号</p>
              {resultData.gene?.talent ? (
                <p className="result-gene-block">
                  <span>世代天赋</span>
                  <br />
                  {resultData.gene.talent}
                </p>
              ) : null}
              {resultData.gene?.limit ? (
                <p className="result-gene-block">
                  <span>家族局限</span>
                  <br />
                  {resultData.gene.limit}
                </p>
              ) : null}
              {resultData.gene?.connection ? (
                <p className="result-gene-block">
                  <span>与子女的连接</span>
                  <br />
                  {resultData.gene.connection}
                </p>
              ) : null}
            </div>

            <div className="result-actions">
              <button className="result-primary" onClick={() => void copyResult()} type="button">
                复制全部内容
              </button>
              <button className="result-secondary" onClick={restartInterview} type="button">
                再采访一次
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
