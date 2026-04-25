import { Link } from "react-router-dom";

export function HomePage() {
  const scrollToWhat = () => {
    document.getElementById("what")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div className="beta-banner">现正邀请首批种子用户内测 · 免费参与</div>

      <nav className="landing-nav">
        <div className="nav-logo">
          <span className="nav-logo-zh">传家宝</span>
          <span className="nav-logo-en">Heirloom</span>
        </div>
        <Link className="nav-cta" to="/start">
          开始记录
        </Link>
      </nav>

      <section className="hero">
        <div aria-hidden="true" className="hero-deco">
          传
        </div>
        <p className="hero-eyebrow">Family Memory OS · 家族记忆 · 家族传承</p>
        <h1 className="hero-title">
          有些话，他们没说，
          <br />
          你也没问
        </h1>
        <p className="hero-subtitle">传下去的，不只是东西</p>
        <p className="hero-desc">
          你知道为什么你的婚姻、钱、关系，
          <br />
          总是走某个固定的路？
          <br />
          <br />
          答案可能不在你身上，在你家族里。
          <br />
          <br />
          当你看见来路，才知道新生命进来，
          <br />
          会被怎样迎接。
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/start">
            免费开始记录
          </Link>
          <button className="btn btn-ghost" onClick={scrollToWhat} type="button">
            了解传家宝是什么
          </button>
        </div>
        <p className="hero-note">内测期间完全免费 · 无需下载 App</p>
      </section>

      <div className="divider" />

      <div className="stat-row">
        <div className="stat-item">
          <span className="stat-num">147</span>
          <span className="stat-label">精选问题</span>
        </div>
        <div className="stat-item">
          <span className="stat-num">3</span>
          <span className="stat-label">访谈框架</span>
        </div>
        <div className="stat-item">
          <span className="stat-num">2</span>
          <span className="stat-label">专属报告</span>
        </div>
      </div>

      <section className="what" id="what">
        <p className="section-label">产品是什么</p>
        <h2 className="section-title">不只是帮老人写一本书</h2>
        <p className="section-body">
          传家宝帮你采访家里的长辈——父母、祖父母——用AI把他们的故事整理成传家册。
          <br />
          <br />
          同时，AI会从这些故事里，分析出你们家族世代相传的天赋模式和局限模式，生成只属于你的
          <strong>家脉图</strong>
          ——让你看清自己的来处。
          <br />
          <br />
          这是家族传承真正的样子：不是东西的流转，是能量的接力。
        </p>
      </section>

      <div className="outputs">
        <div className="output-card">
          <div aria-hidden="true" className="output-card-deco">
            册
          </div>
          <span className="output-tag">传家册</span>
          <h3 className="output-title">长辈的故事，留成一本书</h3>
          <p className="output-desc">
            语音采访，AI整理，生成精装传家册。
            <br />
            童年的家、爱情那一章、人生转折……
            <br />
            一段一段，都有了归处。
          </p>
        </div>

        <div className="output-card gene">
          <div aria-hidden="true" className="output-card-deco">
            脉
          </div>
          <span className="output-tag">家脉图</span>
          <h3 className="output-title">感受你家族里流动的能量</h3>
          <p className="output-desc">
            从故事里提取世代共有的天赋特征，
            <br />
            看见家族的局限模式在哪里，
            <br />
            以及这些，如何在你身上体现。
            <br />
            <br />
            很多人说，第一次读完家脉图，感受到祖辈真实的温暖与欢迎——那叫
            <strong>家族能量</strong>
            。那一刻，他们开始想，把这些传下去。
          </p>
        </div>
      </div>

      <div className="divider" />

      <section className="how" id="how">
        <div aria-hidden="true" className="how-deco">
          问
        </div>
        <p className="section-label">怎么用</p>
        <h2 className="section-title">
          你来采访，
          <br />
          我来整理
        </h2>

        <div className="steps">
          <div className="step">
            <div className="step-num">一</div>
            <div className="step-content">
              <h3 className="step-title">选一张传话牌，去找长辈聊</h3>
              <p className="step-desc">
                147个问题分成21个板块。挑一张你觉得长辈最愿意聊的，打开录音，像平时聊天一样说。不用背问题，不用准备。
              </p>
            </div>
          </div>

          <div className="step">
            <div className="step-num">二</div>
            <div className="step-content">
              <h3 className="step-title">翻牌聊，全程录音</h3>
              <p className="step-desc">
                卡片在屏幕上一张张翻，下面一直在录。想说哪张说哪张，跳过也行。说完关掉就好，不用发文件，不用做任何事。
              </p>
            </div>
          </div>

          <div className="step">
            <div className="step-num">三</div>
            <div className="step-content">
              <h3 className="step-title">整理成册，家脉图生成</h3>
              <p className="step-desc">
                三次录音后，AI把散乱的故事整理出脉络，生成传家册草稿和你的家脉图。你来确认，不用写一个字。
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" />

      <section className="story">
        <div aria-hidden="true" className="story-deco">
          忆
        </div>
        <p className="section-label">真实故事</p>
        <h2 className="section-title">那些从来没被说出口的话</h2>

        <div className="story-card">
          <p className="story-quote">「我在这个领域，如果说第一，全世界没有人敢说第二。」</p>
          <p className="story-source">— 外公，关于他研究日晷的30年</p>
        </div>

        <div className="gene-sample">
          <p className="gene-label">家脉图 · AI提取</p>
          <p className="gene-text">
            <strong>世代天赋：</strong>在没有外部认可的情况下，长期专注于一件事。
            <br />
            <br />
            外公独自研究日晷30年，你对一些小众领域的执着，可能来源于此。
            <br />
            <br />
            <strong>给你的话：</strong>你的"独立"不是反叛，是基因。顺势而为。
          </p>
        </div>

        <div className="story-section-offset">
          <h3 className="section-title section-title-small">
            她说，如果有那段录音，
            <br />
            她会反复听
          </h3>
          <p className="section-body story-section-body">
            她说爸爸从小对她严格。他自己考98分，他爸会问他：剩下两分去哪了。他从来没有肯定过她。
            <br />
            <br />
            我问她：如果爸爸被采访，说了肯定你的话，你会怎样？
          </p>
          <div className="story-card">
            <p className="story-quote">「我会把这段录音收藏下来，反复听。」</p>
            <p className="story-source">— 女儿</p>
          </div>
          <div className="gene-sample">
            <p className="gene-label">家脉图 · AI提取</p>
            <p className="gene-text">
              <strong>世代局限：</strong>高标准背后，是从未被肯定的一代人，用他们唯一会的方式在爱。
              <br />
              <br />
              那段话，她一直在等。她只是不知道怎么开口问。
            </p>
          </div>
        </div>
      </section>

      <div className="divider" />

      <section className="pricing">
        <p className="section-label">内测方案</p>
        <h2 className="section-title">
          先免费体验，
          <br />
          满意再付费
        </h2>

        <div className="price-card">
          <div className="price-tag-row">
            <span className="price-amount">免费</span>
          </div>
          <p className="price-name">内测体验</p>
          <ul className="price-list">
            <li>完整参与3个板块采访</li>
            <li>生成传家册草稿（PDF）</li>
            <li>家脉图基础版报告</li>
            <li>专属访谈框架指导</li>
          </ul>
          <Link className="btn btn-ghost" to="/start">
            免费参与内测
          </Link>
        </div>

        <div className="price-card featured price-card-offset">
          <div className="price-tag-row">
            <span className="price-amount">¥199</span>
            <span className="price-unit">/ 年</span>
          </div>
          <p className="price-name">基础订阅（正式上线后）</p>
          <ul className="price-list">
            <li>无限板块采访</li>
            <li>完整传家册（精装PDF）</li>
            <li>家脉图完整报告</li>
            <li>每周故事推送</li>
            <li>生日彩蛋自动生成</li>
          </ul>
          <button className="btn-primary-dark" type="button">
            正式上线提醒我
          </button>
        </div>
      </section>

      <section className="final-cta" id="cta">
        <div aria-hidden="true" className="final-cta-deco">
          传
        </div>
        <h2 className="final-cta-title">
          你有多久没有
          <br />
          认真问过他们了？
        </h2>
        <p className="final-cta-sub">
          内测期间完全免费。
          <br />
          加入后，我们会发给你第一张传话牌。
          <br />
          <br />
          当你开始记录，家族能量就开始流动。
        </p>
        <div className="final-cta-actions">
          <Link className="btn btn-primary" to="/start">
            加入内测，免费开始
          </Link>
          <p className="final-cta-note">目前仅开放微信联系 · 扫码或搜索「传家宝内测」</p>
        </div>
      </section>

      <footer>
        <p className="footer-logo">传家宝</p>
        <p className="footer-tagline">Stories worth keeping forever.</p>
        <nav aria-label="页脚导航" className="footer-links">
          <a href="#">关于我们</a>
          <a href="#">访谈框架</a>
          <a href="#">隐私政策</a>
          <a href="#">联系我们</a>
        </nav>
        <p className="footer-copy">© 2026 传家宝 Heirloom · 让每个家族的故事都有归处</p>
        <p className="footer-wechat">WeChat: gaoqiantongxue</p>
      </footer>
    </>
  );
}
