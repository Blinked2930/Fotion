"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import webpush from "web-push";

export const sendPush = internalAction({
  args: {
    subscription: v.any(),
    title: v.string(),
    body: v.string()
  },
  handler: async (ctx, args) => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      console.error("❌ CRITICAL ERROR: VAPID keys are missing from Convex Environment Variables!");
      return;
    }

    webpush.setVapidDetails("mailto:admin@fotion.app", publicKey, privateKey);

    try {
      await webpush.sendNotification(
        args.subscription,
        JSON.stringify({ title: args.title, body: args.body })
      );
      console.log("✅ SUCCESS: Apple/Google accepted the payload!");
    } catch (err) {
      console.error("❌ WEB PUSH REJECTED:", err);
    }
  }
});