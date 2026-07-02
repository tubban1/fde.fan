import { Check, Copy, ExternalLink, Link, MoreHorizontal, Share2, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ShareChannel = {
  id: string;
  label: string;
  labelEn: string;
  hint: string;
  hintEn: string;
  action: "copy" | "open";
  url?: string;
};

interface SocialShareProps {
  title: string;
  description?: string;
  path?: string;
  variant?: "inline" | "floating";
  align?: "left" | "right";
}

const SITE_URL = "https://www.fde.fan";

const absoluteUrl = (path?: string) => {
  if (!path) return SITE_URL;
  if (path.startsWith("http")) return path;
  return new URL(path, SITE_URL).toString();
};

const openPopup = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer,width=720,height=640");
};

export default function SocialShare({
  title,
  description = "",
  path,
  variant = "inline",
  align = "right",
}: SocialShareProps) {
  const [open, setOpen] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [shareUrl, setShareUrl] = useState(() => absoluteUrl(path));
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setShareUrl(window.location.href);
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const shareText = description ? `${title}\n${description}` : title;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(shareText);

  const channels = useMemo<ShareChannel[]>(
    () => [
      {
        id: "wechat",
        label: "微信好友",
        labelEn: "WeChat",
        hint: "手机端点主按钮，可在系统面板选择微信",
        hintEn: "Use the main mobile share button for WeChat",
        action: "copy",
      },
      {
        id: "moments",
        label: "朋友圈",
        labelEn: "Moments",
        hint: "手机端点主按钮，可选择朋友圈或复制链接",
        hintEn: "Use the native share sheet or copy the link",
        action: "copy",
      },
      {
        id: "xiaohongshu",
        label: "小红书",
        labelEn: "RED",
        hint: "复制标题和链接，适合做笔记素材",
        hintEn: "Copy title and link for a RED note",
        action: "copy",
      },
      {
        id: "weibo",
        label: "微博",
        labelEn: "Weibo",
        hint: "打开微博分享页",
        hintEn: "Open Weibo share",
        action: "open",
        url: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedText}`,
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        labelEn: "LinkedIn",
        hint: "分享到 LinkedIn",
        hintEn: "Share to LinkedIn",
        action: "open",
        url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      },
      {
        id: "x",
        label: "X",
        labelEn: "X",
        hint: "发布到 X",
        hintEn: "Post to X",
        action: "open",
        url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      },
      {
        id: "copy",
        label: "复制链接",
        labelEn: "Copy",
        hint: "复制当前页面链接",
        hintEn: "Copy page link",
        action: "copy",
      },
    ],
    [encodedText, encodedTitle, encodedUrl],
  );

  const copyShare = async (label = "链接") => {
    const payload = label === "小红书" ? `${title}\n${description}\n${shareUrl}` : shareUrl;

    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setMessage(`${label}已复制`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage("复制失败，请手动复制浏览器地址");
    }
  };

  const handleChannel = async (channel: ShareChannel) => {
    if (channel.action === "copy") {
      await copyShare(channel.label);
      return;
    }

    if (channel.url) {
      openPopup(channel.url);
      setOpen(false);
    }
  };

  const handlePrimaryShare = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({ title, text: description, url: shareUrl });
        setOpen(false);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setMessage("系统分享失败，可改用复制链接");
      }
    }

    setOpen((value) => !value);
  };

  const triggerClass =
    variant === "floating"
      ? "fixed bottom-5 right-5 z-50 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-cyan-300/35 bg-slate-950/90 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-cyan-500/20 backdrop-blur-xl transition hover:border-cyan-200 hover:bg-slate-900"
      : "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/8 px-3 py-2 text-sm font-black text-white transition hover:border-cyan-300/50 hover:bg-cyan-300/10";

  return (
    <div ref={panelRef} className={variant === "floating" ? "contents" : "relative inline-flex"}>
      <button type="button" className={triggerClass} onClick={() => void handlePrimaryShare()}>
        <Share2 className="h-4 w-4" aria-hidden="true" />
        <span className="zh">分享</span>
        <span className="en">Share</span>
      </button>

      {open && (
        <div
          className={[
            "z-50 w-[min(92vw,22rem)] rounded-xl border border-white/14 bg-slate-950/95 p-3 text-white shadow-2xl shadow-black/45 backdrop-blur-xl",
            variant === "floating"
              ? "fixed bottom-20 right-5"
              : `absolute top-full mt-3 ${align === "right" ? "right-0" : "left-0"}`,
          ].join(" ")}
        >
          <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <p className="m-0 text-sm font-black">
                <span className="zh">{canNativeShare ? "更多分享方式" : "复制或网页分享"}</span>
                <span className="en">{canNativeShare ? "More share options" : "Copy or web share"}</span>
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                <span className="zh">
                  {canNativeShare ? "主分享按钮会调起手机系统面板，可选择微信、朋友圈、小红书等 App。" : "当前浏览器不支持系统分享，请复制链接或使用网页分享。"}
                </span>
                <span className="en">
                  {canNativeShare ? "The main button opens your mobile share sheet for installed apps." : "This browser does not support native sharing."}
                </span>
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="关闭分享面板"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {canNativeShare && (
            <button
              type="button"
              className="mb-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/35 bg-cyan-300/12 px-3 py-2 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/20"
              onClick={() => void handlePrimaryShare()}
            >
              <Smartphone className="h-4 w-4" aria-hidden="true" />
              <span className="zh">打开手机分享面板</span>
              <span className="en">Open mobile share sheet</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {channels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                className="group min-h-[4.75rem] rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-cyan-300/45 hover:bg-cyan-300/10"
                onClick={() => void handleChannel(channel)}
              >
                <span className="mb-2 flex items-center justify-between gap-2 text-sm font-black text-white">
                  <span>
                    <span className="zh">{channel.label}</span>
                    <span className="en">{channel.labelEn}</span>
                  </span>
                  {channel.action === "open" ? (
                    <ExternalLink className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
                  ) : channel.id === "wechat" || channel.id === "moments" || channel.id === "xiaohongshu" ? (
                    <MoreHorizontal className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
                  )}
                </span>
                <span className="block text-xs leading-4 text-slate-400 group-hover:text-slate-200">
                  <span className="zh">{channel.hint}</span>
                  <span className="en">{channel.hintEn}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-slate-300">
            {copied ? <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" /> : <Link className="h-4 w-4 text-cyan-200" aria-hidden="true" />}
            <span className="truncate">{message || shareUrl}</span>
          </div>
        </div>
      )}
    </div>
  );
}
