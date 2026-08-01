import { UniversalTextSelection } from "@round-selection/react";

const messages = [
  { mine: false, text: "The range is still native, so copying and keyboard semantics remain intact." },
  { mine: true, text: "And the shape is only an overlay behind the text?" },
  { mine: false, text: "Exactly. Select across this reply to see a compact contour inside a conversational surface." },
];

export function ChatDemo() {
  return (
    <div className="project-stage chat-stage">
      <div className="chat-header"><span className="avatar">RS</span><div><strong>Geometry group</strong><small>3 participants</small></div></div>
      <div className="chat-list">
        {messages.map((message, index) => (
          <UniversalTextSelection
            key={message.text}
            className={message.mine ? "message-row message-row-mine" : "message-row"}
            mode="contour-union"
            radius={6}
            selectionColor="rgb(51 144 236 / .46)"
            contentClassName={message.mine ? "bubble bubble-mine" : "bubble"}
          >
            <p>{message.text}</p><time>{`18:0${index + 2}`}</time>
          </UniversalTextSelection>
        ))}
      </div>
    </div>
  );
}
