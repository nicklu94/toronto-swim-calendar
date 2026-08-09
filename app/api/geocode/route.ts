import { fsaCentroids } from "../../fsa-centroids";

const postalCodePattern = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/;

export async function GET(request: Request) {
  const postalCode = new URL(request.url).searchParams.get("postalCode")?.trim().toUpperCase() ?? "";
  if (!postalCodePattern.test(postalCode)) {
    return Response.json({ error: "请输入有效的加拿大邮编，例如 M1P 4P5。" }, { status: 400 });
  }

  const fsa = postalCode.slice(0, 3);
  const result = fsaCentroids[fsa];
  if (!result) {
    return Response.json({ error: "测试版目前支持多伦多、Markham、Richmond Hill 和 Vaughan 的邮编。" }, { status: 404 });
  }
  return Response.json(
    { ...result, postalCode, approximate: true },
    { headers: { "Cache-Control": "public, max-age=604800" } },
  );
}
