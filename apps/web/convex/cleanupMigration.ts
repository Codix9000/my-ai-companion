import { internalMutation } from "./_generated/server";

/**
 * ONE-TIME CLEANUP: Removes orphaned fields left by the intimacy feature.
 *
 * Run from the Convex dashboard:
 *   Functions → cleanupMigration:cleanupOrphanedFields → Run
 *
 * After running successfully, delete this file and remove the temporary
 * schema fields (intimacyScore from chats, imagePrompt from messages),
 * then redeploy.
 */
export const cleanupOrphanedFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    let chatsFixed = 0;
    let messagesFixed = 0;

    const chats = await ctx.db.query("chats").collect();
    for (const chat of chats) {
      if ((chat as any).intimacyScore !== undefined) {
        const { intimacyScore, ...rest } = chat as any;
        await ctx.db.replace(chat._id, rest);
        chatsFixed++;
      }
    }

    const messages = await ctx.db.query("messages").collect();
    for (const msg of messages) {
      if ((msg as any).imagePrompt !== undefined) {
        const { imagePrompt, ...rest } = msg as any;
        await ctx.db.replace(msg._id, rest);
        messagesFixed++;
      }
    }

    console.log(
      `[Cleanup] Done. Fixed ${chatsFixed} chats, ${messagesFixed} messages.`,
    );
    return { chatsFixed, messagesFixed };
  },
});
