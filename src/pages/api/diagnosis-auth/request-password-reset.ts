import type { APIRoute } from "astro";
import handler from "../../../server/diagnosis-auth/request-password-reset.js";
import { adaptNextHandler } from "../../../server/nextHandlerAdapter";

export const prerender = false;
export const POST: APIRoute = ({ request }) => adaptNextHandler(handler, request);
