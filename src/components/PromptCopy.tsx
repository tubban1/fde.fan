import { Check, Copy } from "lucide-react";
import { useState } from "react";

export default function PromptCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button className="copy-button" type="button" onClick={copy}>
      {copied ? <Check size={16} /> : <Copy size={16} />}
      <span>{copied ? "Copied" : "Copy prompt"}</span>
    </button>
  );
}
