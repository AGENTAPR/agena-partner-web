import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import createEmotionServer from "@emotion/server/create-instance";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { renderToReadableStream } from "react-dom/server";
import { isbot } from "isbot";

export const streamTimeout = 5_000;

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
): Promise<Response> {
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders });
  }

  const cache = createCache({ key: "css" });
  const { extractCritical } = createEmotionServer(cache);

  const userAgent = request.headers.get("user-agent");
  const waitForAll = Boolean((userAgent && isbot(userAgent)) || routerContext.isSpaMode);

  let shellRendered = false;

  const stream = await renderToReadableStream(
    <CacheProvider value={cache}>
      <ServerRouter context={routerContext} url={request.url} />
    </CacheProvider>,
    {
      onError(error: unknown) {
        responseStatusCode = 500;
        if (shellRendered) {
          console.error(error);
        }
      },
      ...(waitForAll
        ? {
            onAllReady() {
              shellRendered = true;
            },
          }
        : {
            onShellReady() {
              shellRendered = true;
            },
          }),
    },
  );

  const html = await streamToString(stream as ReadableStream<Uint8Array>);
  const { html: htmlWithStyles, css } = extractCritical(html);

  const styledHtml = htmlWithStyles.replace(
    "</head>",
    `<style data-emotion="css">${css}</style></head>`,
  );

  responseHeaders.set("Content-Type", "text/html");

  return new Response(styledHtml, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
