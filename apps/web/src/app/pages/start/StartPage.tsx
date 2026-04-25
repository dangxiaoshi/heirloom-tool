import { useMemo, useState } from "react";

type CardColor = "accent" | "green" | "gold";

type Card = {
  id: number;
  fw: string;
  fwNum: string;
  color: CardColor;
  twoChar: string;
  name: string;
  deco: string;
  qs: string[];
};

const COLORS: Record<CardColor, string> = {
  accent: "#8B5E3C",
  green: "#4A5940",
  gold: "#9B6F28",
};

const CARDS: Card[] = [
  { id: 1, fw: "时间维度", fwNum: "01/07", color: "accent", twoChar: "旧宅", name: "童年的家", deco: "旧", qs: ["您小时候住在哪里？能描述一下那个房子或院子吗？", "童年最常出现的气味是什么？", "家里最重要的一件东西是什么？它现在在哪里？", "小时候家里谁说话最有分量？他/她说的哪句话你还记得？", "您小时候家里穷吗？那时候「穷」对你意味着什么？", "童年里最让你害怕的一件事是什么？", "记忆里最快乐的一个下午，是在做什么？"] },
  { id: 2, fw: "时间维度", fwNum: "02/07", color: "accent", twoChar: "启蒙", name: "读书与成长", deco: "蒙", qs: ["您上学了吗？上到几年级？", "那时候最喜欢哪个老师？为什么？", "有没有特别擅长或特别不行的科目？", "有没有因为家里的原因没能继续念书？那时候心里什么感受？", "年轻时最崇拜谁？", "年轻时有没有一个「梦想」，哪怕很小的那种？", "第一次离开家乡是什么时候，去哪里，为什么？"] },
  { id: 3, fw: "时间维度", fwNum: "03/07", color: "accent", twoChar: "初程", name: "青年与选择", deco: "程", qs: ["您第一份工作是什么？是怎么找到的？", "那时候一个月挣多少钱？钱都花在哪里了？", "年轻时最想成为什么样的人？后来变成那样了吗？", "有没有一门手艺是自己摸索学会的，没人正式教过您？", "年轻时有没有一段特别迷茫、不知道要做什么的时期？", "那时候最好的朋友是谁？你们是怎么认识的？", "如果可以回到20岁，最想对那时的自己说什么？"] },
  { id: 4, fw: "时间维度", fwNum: "04/07", color: "accent", twoChar: "情缘", name: "爱情那一章", deco: "缘", qs: ["您是怎么认识您爱人的？", "在一起最初那段时间，印象最深的一幕是什么？", "您是怎么知道「这个人就是了」的？", "结婚前家里有没有人反对？后来怎么解决的？", "婚后最艰难的一段时间是什么时候？你们是怎么撑过来的？", "您爱人最让您感动的一件小事是什么？", "如果用一句话形容你们的婚姻，会是什么？"] },
  { id: 5, fw: "时间维度", fwNum: "05/07", color: "accent", twoChar: "骨肉", name: "为人父母", deco: "骨", qs: ["还记得第一次抱着孩子的感受吗？", "孩子小时候，最让您骄傲的一件事是什么？", "养孩子过程中，最让您担心的是什么？", "您觉得自己最成功的教育是什么？最遗憾的是什么？", "有没有一件当时对孩子做了、后来觉得做错了的事？", "您希望孩子继承您的哪一点？不希望继承哪一点？", "孩子现在的样子，有没有让您想到年轻时的自己？"] },
  { id: 6, fw: "时间维度", fwNum: "06/07", color: "accent", twoChar: "负重", name: "中年的重量", deco: "重", qs: ["这一生，最重的一段时间是什么时候？", "那段时间里，是什么让您撑过来的？", "您有没有经历过真正意义上的「失去」？", "身体这辈子什么时候最让您警醒过？有没有一场病改变了您对生命的看法？", "有没有一件事，当时没有对任何人说，现在可以说了？（不想说可以跳过）", "人到中年，您最大的领悟是什么？", "这辈子最感激的人是谁？有没有当面道过谢？"] },
  { id: 7, fw: "时间维度", fwNum: "07/07", color: "accent", twoChar: "此刻", name: "现在的你", deco: "刻", qs: ["现在这个年纪，什么事情让您感到满足？", "什么事情还让您放不下？", "您觉得这辈子最重要的事情是什么？做到了吗？", "您害怕死亡吗？您觉得死亡是什么？", "如果只能留一件东西给后代，您会留什么？", "您最希望被记住的是什么？", "您现在最想说却还没说出口的话是什么？"] },
  { id: 8, fw: "关系维度", fwNum: "01/07", color: "green", twoChar: "父影", name: "与父亲", deco: "父", qs: ["您的父亲是什么样的人？用三个词形容他。", "父亲最让您敬佩的地方是什么？", "父亲有没有一句话，让您记了一辈子？", "您和父亲之间，有没有一件事从来没有和解过？", "父亲对您影响最大的一件事是什么？", "您觉得自己哪些地方最像父亲？", "如果父亲还在，您最想问他什么？"] },
  { id: 9, fw: "关系维度", fwNum: "02/07", color: "green", twoChar: "母恩", name: "与母亲", deco: "母", qs: ["您的母亲是什么样的人？用三个词形容她。", "母亲最让您感动的一个瞬间是什么？", "您和母亲的关系，经历过哪些变化？", "母亲在最艰难的时候，是怎么做的？", "您觉得自己哪些地方最像母亲？", "有没有一件事，希望能早点对母亲说？", "母亲给您最大的礼物是什么？（不一定是物质的）"] },
  { id: 10, fw: "关系维度", fwNum: "03/07", color: "green", twoChar: "手足", name: "与兄弟姐妹", deco: "足", qs: ["您有几个兄弟姐妹？家里排第几？", "小时候和兄弟姐妹最好的记忆是什么？", "有没有闹过很大的矛盾？后来怎么了？", "兄弟姐妹里，谁对您影响最深？为什么？", "长大之后，你们还亲近吗？", "有没有觉得对某个兄弟姐妹亏欠过的事？", "如果可以对他们说一句话，你会说什么？"] },
  { id: 11, fw: "关系维度", fwNum: "04/07", color: "green", twoChar: "知己", name: "与老朋友", deco: "己", qs: ["您这辈子，最好的朋友是谁？", "你们是怎么认识的？友谊里有没有一个关键的转折点？", "他/她做过最让您感动的一件事是什么？", "你们有没有因为某件事疏远过？后来有没有修复？", "有没有一个朋友，现在还很想念，但已经失去联系了？", "您觉得什么样的朋友是真正的朋友？", "友谊给了您什么，是家人给不了的？"] },
  { id: 12, fw: "关系维度", fwNum: "05/07", color: "green", twoChar: "乡愁", name: "与故乡", deco: "乡", qs: ["您的故乡在哪里？什么是记忆里最典型的故乡味道？", "您离开故乡是什么时候？是什么让您离开的？", "故乡最让您想念的是什么？", "您有没有回去过？回去时是什么感受？", "故乡的人，有没有一个您一直惦记着的？", "故乡对您的性格，有什么影响？", "如果可以再回去住一段时间，您愿意吗？"] },
  { id: 13, fw: "关系维度", fwNum: "06/07", color: "green", twoChar: "内观", name: "与自己", deco: "观", qs: ["您觉得自己是什么样的人？", "什么时候，第一次觉得自己「真正长大了」？", "您觉得自己最大的天赋是什么？可以是很普通的事。", "有没有一件事，一直想做但一直没做，到现在还放不下？", "有没有经历过一次真正改变了您的事？", "如果要给自己写一句墓志铭，您会写什么？", "现在的您，喜欢自己吗？"] },
  { id: 14, fw: "关系维度", fwNum: "07/07", color: "green", twoChar: "洪流", name: "与时代", deco: "流", qs: ["您经历过哪些大的历史事件？那时候您在做什么？", "时代变化最快的那段时间，您是什么感受？", "您有没有因为时代，失去过什么？", "您有没有因为时代，得到过什么？", "您相信命运吗？有没有一件事让您觉得「这是老天安排好的」？", "如果用一个词形容您所经历的那个时代，是什么词？", "您觉得现在的世界，比您年轻时更好了吗？"] },
  { id: 15, fw: "故事线", fwNum: "01/07", color: "gold", twoChar: "启程", name: "一次出发", deco: "程", qs: ["您这辈子最重要的一次「出发」是什么？", "出发前，您的心情是什么？", "出发的时候，有没有人送您或者阻拦您？", "那一次出发，改变了您什么？", "如果没有那次出发，您觉得现在会是什么样？", "出发的路上，遇到过什么困难？是怎么解决的？", "现在回头看，那次出发是对的吗？"] },
  { id: 16, fw: "故事线", fwNum: "02/07", color: "gold", twoChar: "拐点", name: "一次转折", deco: "拐", qs: ["您这一生，最大的转折是什么时候发生的？", "那个转折是您主动选择的，还是被迫的？", "转折前，您的生活是什么样的？", "转折后，什么发生了根本的变化？", "那个时候，最支持您的人是谁？", "如果没有那次转折，您觉得人生会走向哪里？", "那次经历教会了您什么？"] },
  { id: 17, fw: "故事线", fwNum: "03/07", color: "gold", twoChar: "跌落", name: "一次失败", deco: "落", qs: ["您这辈子，有没有一次真正意义上的失败？", "那次失败，让您失去了什么？", "当时最难熬的是什么？", "周围的人是怎么对待您的？", "您是怎么从那次失败里站起来的？", "那次失败，后来变成了您的什么？", "您现在怎么看待那次失败？"] },
  { id: 18, fw: "故事线", fwNum: "04/07", color: "gold", twoChar: "抉择", name: "一次选择", deco: "择", qs: ["您做过最艰难的一次选择是什么？", "两个选项分别是什么？", "您最终怎么决定的？", "做了那个选择之后，您后悔过吗？", "如果当时选了另一条路，您觉得会怎样？", "那次选择，让您对「选择」这件事有了什么新的理解？", "您会把那次选择的经验，告诉后代吗？怎么告诉？"] },
  { id: 19, fw: "故事线", fwNum: "05/07", color: "gold", twoChar: "荣耀", name: "一件骄傲的事", deco: "荣", qs: ["您这辈子最骄傲的一件事是什么？不一定是大事，可以是很小的。", "那件事是怎么发生的？", "当时您是什么感受？", "有没有人知道这件事，或者当时见证了这件事？", "那件事对您意味着什么？", "您希望后代知道这件事吗？", "那件事里，您觉得自己展现出了什么样的品质？"] },
  { id: 20, fw: "故事线", fwNum: "06/07", color: "gold", twoChar: "未竟", name: "一件遗憾的事", deco: "竟", qs: ["您有没有一件事，到现在还觉得遗憾？", "那件遗憾是关于什么的？（关系、选择、话没说出口……）", "如果可以重来，您会怎么做？", "那件遗憾，您和谁说过吗？", "那个遗憾，现在还能弥补吗？", "那件遗憾教会了您什么？", "您希望后代从这件事里学到什么？"] },
  { id: 21, fw: "故事线", fwNum: "07/07", color: "gold", twoChar: "家训", name: "给后代的话", deco: "训", qs: ["您最想让后代记住的一件事是什么？", "您觉得我们家族最独特的地方是什么？", "您希望家族的什么，能一代一代传下去？", "您希望家族的什么，到您这一代就改变了？", "如果只能留一句话给后代，您会说什么？", "您觉得我（提问者）有没有继承到您身上的什么？", "有没有什么话，您一直想说，但从来没有机会说出来的？"] },
];

type Screen = "s1" | "s2" | "s3";
type View = "pile-view" | "card-view" | "done-view";
type CardSide = "cover" | "face";

function readProgress(personName: string) {
  try {
    const raw = localStorage.getItem(`heirloom_${personName}`);
    if (!raw) return new Set<number>();
    const data = JSON.parse(raw) as { completed?: number[] };
    return new Set(data.completed ?? []);
  } catch {
    return new Set<number>();
  }
}

function writeProgress(personName: string, completed: Set<number>) {
  try {
    localStorage.setItem(`heirloom_${personName}`, JSON.stringify({ completed: [...completed] }));
  } catch {
    // ignore storage errors
  }
}

function pickRandom<T>(pool: T[]) {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function StartPage() {
  const [screen, setScreen] = useState<Screen>("s1");
  const [view, setView] = useState<View>("pile-view");
  const [personNameInput, setPersonNameInput] = useState("");
  const [personName, setPersonName] = useState("");
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [swapsLeft, setSwapsLeft] = useState(2);
  const [flipping, setFlipping] = useState(false);
  const [cardSide, setCardSide] = useState<CardSide>("cover");
  const [nameError, setNameError] = useState(false);

  const remaining = useMemo(() => CARDS.filter((card) => !completed.has(card.id)), [completed]);

  const progressPercent = (completed.size / 21) * 100;
  const pileHint = remaining.length === 21 ? "点击牌堆，抽出今天的话题" : `还剩 ${remaining.length} 张，继续抽`;

  const goSpeech = () => {
    const value = personNameInput.trim();
    if (!value) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setPersonName(value);
    setCompleted(readProgress(value));
    setScreen("s2");
  };

  const goPile = () => {
    setScreen("s3");
    showPile();
  };

  const showPile = () => {
    const pool = CARDS.filter((card) => !completed.has(card.id));
    if (pool.length === 0) {
      setView("done-view");
      return;
    }
    setView("pile-view");
  };

  const drawCard = () => {
    if (flipping || remaining.length === 0) return;
    setCurrentCard(pickRandom(remaining));
    setSwapsLeft(2);
    setCardSide("cover");
    setView("card-view");
    window.setTimeout(() => {
      setFlipping(true);
      window.setTimeout(() => {
        setCardSide("face");
      }, 225);
      window.setTimeout(() => {
        setFlipping(false);
      }, 500);
    }, 400);
  };

  const swapCard = () => {
    if (flipping || !currentCard || swapsLeft <= 0) return;
    const pool = remaining.filter((card) => card.id !== currentCard.id);
    if (pool.length === 0) return;

    setFlipping(true);
    setSwapsLeft((value) => value - 1);
    window.setTimeout(() => {
      setCurrentCard(pickRandom(pool));
      setCardSide("cover");
    }, 225);
    window.setTimeout(() => {
      setFlipping(false);
      window.setTimeout(() => {
        setFlipping(true);
        window.setTimeout(() => {
          setCardSide("face");
        }, 225);
        window.setTimeout(() => {
          setFlipping(false);
        }, 500);
      }, 200);
    }, 500);
  };

  const markDone = () => {
    if (!currentCard || flipping) return;
    const next = new Set(completed);
    next.add(currentCard.id);
    setCompleted(next);
    writeProgress(personName, next);
    setFlipping(true);
    setCardSide("face");
    window.setTimeout(() => {
      setCardSide("cover");
    }, 225);
    window.setTimeout(() => {
      setFlipping(false);
      setCurrentCard(null);
      const left = CARDS.filter((card) => !next.has(card.id));
      setView(left.length === 0 ? "done-view" : "pile-view");
    }, 500);
  };

  const resetSession = () => {
    const next = new Set<number>();
    setCompleted(next);
    writeProgress(personName, next);
    setCurrentCard(null);
    setCardSide("cover");
    setView("pile-view");
  };

  return (
    <>
      <div className="card-app">
        <div className={`card-screen ${screen === "s1" ? "active" : ""}`} id="s1">
          <div className="s1-logo">传</div>
          <div className="s1-brand">传 家 宝</div>
          <div className="field-label">今天采访的是？</div>
          <input
            autoComplete="off"
            className={`name-input ${nameError ? "error" : ""}`}
            maxLength={10}
            onChange={(event) => {
              setPersonNameInput(event.target.value);
              if (nameError) setNameError(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") goSpeech();
            }}
            placeholder={nameError ? "请先填写长辈的名字或称呼" : "外公、爷爷、妈妈…"}
            spellCheck={false}
            type="text"
            value={personNameInput}
          />
          <button className="btn-solid" onClick={goSpeech} type="button">
            开始
          </button>
        </div>

        <div className={`card-screen ${screen === "s2" ? "active" : ""}`} id="s2">
          <div className="speech-scroll">
            <div className="speech-lines">
              <div className="speech-line">
                <div className="speech-bar" />
                <p className="speech-text">
                  <em>{personName || "外公"}</em>，今天我想跟您做一件特别的事。
                </p>
              </div>
              <div className="speech-line">
                <div className="speech-bar" />
                <p className="speech-text">我买了一套叫「传家宝」的问题卡片。里面有 21 张卡，每张卡都是一个话题——关于您的童年、您的父母、您这辈子做过的选择、让您骄傲的事、还有您最想告诉我们的话。</p>
              </div>
              <div className="speech-line">
                <div className="speech-bar" />
                <p className="speech-text">我们每次只抽一张，我来问，您来说，不用准备，想到哪里说哪里。说错了没关系，跳过也没关系。</p>
              </div>
              <div className="speech-line">
                <div className="speech-bar" />
                <p className="speech-text">我想把您说的话都留下来，留给我们家。</p>
              </div>
            </div>
          </div>
          <button className="btn-solid" id="btn-ready" onClick={goPile} type="button">
            我准备好了
          </button>
        </div>

        <div className={`card-screen ${screen === "s3" ? "active" : ""}`} id="s3">
          <div className="card-stage">
            <div className="card-view" style={{ display: view === "pile-view" ? "flex" : "none" }}>
              <div
                className="pile-wrapper"
                onClick={drawCard}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") drawCard();
                }}
                role="button"
                tabIndex={0}
              >
                <div className="pile-card pc3">
                  <div className="pile-inner">
                    <span className="pile-deco">传</span>
                  </div>
                </div>
                <div className="pile-card pc2">
                  <div className="pile-inner">
                    <span className="pile-deco">传</span>
                  </div>
                </div>
                <div className="pile-card pc1">
                  <div className="pile-inner">
                    <span className="pile-deco">传</span>
                    <div className="pile-brand">
                      <span className="pile-brand-char">传</span>
                      <span className="pile-brand-name">传 家 宝</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="pile-hint">{pileHint}</p>

              <div className="progress-wrap">
                <div className="progress-text">已完成 {completed.size} / 21</div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="card-view active" style={{ display: view === "card-view" ? "flex" : "none" }}>
              {currentCard ? (
                <>
                  <div className="flip-wrap">
                    <div className={`flip-card ${flipping ? "flipping" : ""}`}>
                      <div className={cardSide === "cover" ? "cback" : "cface"} style={{ background: cardSide === "cover" ? COLORS[currentCard.color] : undefined }}>
                        {cardSide === "cover" ? (
                          <>
                            <span className="cback-deco">{currentCard.deco}</span>
                            <div className="cback-center">
                              <span className="cback-char">{currentCard.twoChar}</span>
                              <span className="cback-name">传 家 宝</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="cface-top" style={{ background: COLORS[currentCard.color] }}>
                              <span className="cface-bg">{currentCard.deco}</span>
                              <div className="cface-tag">
                                {currentCard.fw} · {currentCard.fwNum}
                              </div>
                              <div className="cface-chars">{currentCard.twoChar}</div>
                              <div className="cface-sub">{currentCard.name}</div>
                            </div>
                            <div className="cface-bottom">
                              <div className="qs-list">
                                {currentCard.qs.map((question, index) => (
                                  <div className="q-row" key={question}>
                                    <span className="q-num" style={{ color: COLORS[currentCard.color] }}>
                                      {index + 1}
                                    </span>
                                    <span className="q-txt">{question}</span>
                                  </div>
                                ))}
                              </div>
                              <button className="btn-solid" onClick={markDone} style={{ background: COLORS[currentCard.color], fontSize: "14px", minHeight: "48px" }} type="button">
                                这张聊完了 ✓
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button className="btn-ghost card-btn-ghost" disabled={swapsLeft <= 0} onClick={swapCard} type="button">
                      {swapsLeft > 0 ? `换一张（还可换 ${swapsLeft} 次）` : "已换过两次了"}
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <div className="done-view" style={{ display: view === "done-view" ? "flex" : "none" }}>
              <div className="done-char">传</div>
              <div className="done-title">全部聊完了</div>
              <div className="done-sub">
                和 <strong style={{ color: "var(--accent)" }}>{personName}</strong> 的 21 张卡都聊过了
                <br />
                留下了一段珍贵的家族记忆
              </div>
              <button className="btn-ghost card-btn-ghost reset-btn" onClick={resetSession} type="button">
                重新开始
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="card-footer-note">WeChat: gaoqiantongxue</p>
    </>
  );
}
