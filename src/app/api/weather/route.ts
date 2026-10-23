import { connection } from "next/server";
import { guard } from "@/lib/server/guard";
import { getWeather } from "@/lib/weather";

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json(await getWeather());
}
