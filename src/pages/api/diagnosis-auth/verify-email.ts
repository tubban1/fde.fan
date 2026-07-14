import type { APIRoute } from "astro";
import handler from "../../../server/diagnosis-auth/verify-email.js";
import { adaptNextHandler } from "../../../server/nextHandlerAdapter";

export const prerender = false;
export const GET: APIRoute = ({ request }) => adaptNextHandler(handler, request);
export const POST: APIRoute = ({ request }) => adaptNextHandler(handler, request);
