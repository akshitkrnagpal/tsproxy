import pc from "picocolors";

export async function health() {
  const proxyUrl = process.env.PROXY_URL || "http://localhost:3000";

  console.log(pc.bold("\nHealth check\n"));

  try {
    const res = await fetch(`${proxyUrl}/api/health`);
    const data = await res.json() as any;

    const proxyOk = data.proxy?.status === "ok";
    const tsOk = data.typesense?.status === "ok";
    const redisStatus = data.redis?.status;
    const redisOk = redisStatus === "ok" || redisStatus === "not_configured";

    console.log(
      `  ${proxyOk ? pc.green("✓") : pc.red("✗")} Proxy        ${proxyOk ? "ok" : "error"}`,
    );
    console.log(
      `  ${tsOk ? pc.green("✓") : pc.red("✗")} Typesense    ${tsOk ? "ok" : data.typesense?.error || "error"} ${pc.dim(data.typesense?.host || "")}`,
    );
    console.log(
      `  ${redisStatus === "ok" ? pc.green("✓") : redisStatus === "not_configured" ? pc.dim("-") : pc.red("✗")} Redis        ${redisStatus} ${pc.dim(data.redis?.host || "")}`,
    );

    console.log(
      `\n  Status: ${data.status === "healthy" ? pc.green("healthy") : pc.red("degraded")}`,
    );
  } catch (err) {
    console.error(
      `  ${pc.red("✗")} Cannot connect to proxy at ${proxyUrl}`,
    );
    console.error(`    ${(err as Error).message}`);
    console.error("\n  Is the proxy running? Start with: tsproxy dev");
    process.exit(1);
  }
}
