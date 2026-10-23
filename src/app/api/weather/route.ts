import { connection } from "next/server";
import { getWeather } from "@/lib/weather";

export async function GET() {
  await connection();
  return Response.json(await getWeather());
}
