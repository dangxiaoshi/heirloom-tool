import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <section className="page">
      <p className="eyebrow">Heirloom</p>
      <h1>把长辈讲过的话，留下来。</h1>
      <p className="muted">1.0 主链路：抽卡提问、录音上传、阿里云转写、家族记忆留存。</p>
      <Link className="button" to="/start">
        开始一次采访
      </Link>
    </section>
  );
}
