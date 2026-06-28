type FinishCallback = () => void | Promise<void>;

interface AdaptedResponse {
  statusCode: number;
  headers: Record<string, string>;
  chunks: Uint8Array[];
  finished: boolean;
  writableEnded: boolean;
  responseStarted: boolean;
  streamController: ReadableStreamDefaultController<Uint8Array> | null;
  finishCallbacks: FinishCallback[];
  status: (code: number) => AdaptedResponse;
  setHeader: (key: string, value: string) => void;
  writeHead: (code: number, headers?: Record<string, string>) => void;
  json: (value: unknown) => void;
  write: (chunk: unknown) => void;
  end: (chunk?: unknown) => void;
  on: (event: string, callback: FinishCallback) => void;
}

function toBytes(chunk: unknown): Uint8Array {
  if (chunk instanceof Uint8Array) return chunk;
  if (typeof chunk === "string") return new TextEncoder().encode(chunk);
  return new TextEncoder().encode(String(chunk ?? ""));
}

function concatBytes(chunks: Uint8Array[]) {
  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function responseHeaders(headers: Record<string, string>) {
  const nextHeaders = new Headers(headers);
  nextHeaders.delete("Transfer-Encoding");
  return nextHeaders;
}

function createResponse(resolve: (response: Response) => void): AdaptedResponse {
  let res: AdaptedResponse;
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
  });

  const resolveStreamingResponse = () => {
    if (res.responseStarted) return;
    res.responseStarted = true;
    resolve(new Response(stream, {
      status: res.statusCode,
      headers: responseHeaders(res.headers),
    }));
  };

  const runFinishCallbacks = () => {
    for (const callback of res.finishCallbacks) {
      Promise.resolve(callback()).catch((error) => console.error("[adapter finish callback]", error));
    }
  };

  res = {
    statusCode: 200,
    headers: {},
    chunks: [],
    finished: false,
    writableEnded: false,
    responseStarted: false,
    streamController,
    finishCallbacks: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    writeHead(code, headers = {}) {
      this.statusCode = code;
      Object.assign(this.headers, headers);
      if (/text\/plain|text\/event-stream/i.test(this.headers["Content-Type"] || "")) {
        resolveStreamingResponse();
      }
    },
    json(value) {
      this.headers["Content-Type"] = "application/json; charset=utf-8";
      this.end(JSON.stringify(value));
    },
    write(chunk) {
      const bytes = toBytes(chunk);
      if (this.responseStarted) {
        streamController?.enqueue(bytes);
        return;
      }
      if (/text\/plain|text\/event-stream/i.test(this.headers["Content-Type"] || "")) {
        resolveStreamingResponse();
        streamController?.enqueue(bytes);
        return;
      }
      this.chunks.push(bytes);
    },
    end(chunk) {
      if (this.finished) return;
      this.finished = true;
      this.writableEnded = true;
      if (this.responseStarted) {
        if (chunk !== undefined) this.write(chunk);
        streamController?.close();
        runFinishCallbacks();
        return;
      }
      if (chunk !== undefined) this.write(chunk);
      const body = this.chunks.length ? concatBytes(this.chunks) : null;
      const response = new Response(body, {
        status: this.statusCode,
        headers: responseHeaders(this.headers),
      });
      resolve(response);
      runFinishCallbacks();
    },
    on(event, callback) {
      if (event === "finish") this.finishCallbacks.push(callback);
    },
  };
  return res;
}

export async function adaptNextHandler(handler: (req: any, res: any) => Promise<void> | void, request: Request) {
  let body: unknown = {};
  const contentType = request.headers.get("content-type") || "";
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (contentType.includes("application/json")) {
      body = await request.json().catch(() => ({}));
    } else {
      body = await request.text().catch(() => "");
    }
  }

  return await new Promise<Response>((resolve) => {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const req = {
      method: request.method,
      body,
      query,
      headers: Object.fromEntries(request.headers.entries()),
    };
    const res = createResponse(resolve);
    Promise.resolve(handler(req, res)).then(() => {
      if (!res.finished) res.end();
    }).catch((error) => {
      console.error("[adaptNextHandler]", error);
      if (!res.finished) {
        res.status(500).json({ error: "Internal Server Error" });
      }
    });
  });
}
