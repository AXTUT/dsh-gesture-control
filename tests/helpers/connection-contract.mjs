// Parser excerpt adapted (formatting only) from DSH 0.2.1-rc.2:
// @deepseek-ai/dsh-client-connection/lib/client.browser.js:1288-1316.
// Copyright (c) 2026 DeepSeek. MIT license: ./DSH-LICENSE.txt.
// Test-only RpcId branding is identity; the fixture does not create a connection.
const RpcId = value => value;
export function parseConnectionResponse(value) {
  if (!isRecord(value) || value.type !== "server-response" || typeof value.rpcId !== "string") throw new TypeError("connection: invalid server-response envelope");
  const result = value.result;
  if (!isRecord(result)) throw new TypeError("connection: invalid server-response result");
  if (result.ok === true) return {
    rpcId: RpcId(value.rpcId),
    result: {ok: true, value: result.value}
  };
  if (result.ok !== false || !isRecord(result.error)) throw new TypeError("connection: invalid server-response result");
  const error = result.error;
  if (typeof error.code !== "string" || typeof error.message !== "string" || !isRecord(error.details)) throw new TypeError("connection: invalid server-response failure");
  return {
    rpcId: RpcId(value.rpcId),
    result: {ok: false, error: {code: error.code, message: error.message, details: error.details}}
  };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
// Installed Host's JSON branch, lib/index.js:938-953. Binary is not exercised.
export function jsonWireRoundTrip(result, rpcId = 'test-rpc-id') {
  if (result.ok && result.attachments?.length) throw Error('Binary fixture not implemented');
  const { attachments, ...success } = result;
  const wire = JSON.parse(JSON.stringify({type: 'server-response', rpcId, result: result.ok ? success : result}));
  return parseConnectionResponse(wire).result;
}
