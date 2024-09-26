import dbConnect from '../../lib/dbConnect';
import Verification from '../../models/Verification';
import bot from '../../lib/botClient';
import crypto from 'crypto';

export default async function handler(req, res) {
  console.log('Received update:', JSON.stringify(req.body, null, 2));

  if (req.method !== 'POST') {
    console.log('Method not allowed');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Attempting to connect to MongoDB');
    await dbConnect();
    console.log('Connected to MongoDB');

    console.log('Setting up chat_join_request handler');
    bot.on('chat_join_request', async (ctx) => {
      console.log('Received chat_join_request');
      try {
        // Check if a verification already exists for this user and group
        let verification = await Verification.findOne({
          groupId: ctx.chat.id,
          memberId: ctx.from.id,
          verificationStatus: false
        });

        if (!verification) {
          const verificationLink = crypto.randomBytes(20).toString('hex');
          
          verification = new Verification({
            groupId: ctx.chat.id,
            memberId: ctx.from.id,
            verificationLink,
            verificationStatus: false
          });

          await verification.save();
          console.log(`New verification created for user: ${ctx.from.id}`);
        } else {
          console.log(`Using existing verification for user: ${ctx.from.id}`);
        }

        const verificationUrl = `https://reval-v2.vercel.app/${verification.verificationLink}`;
        
        const inlineKeyboard = {
          inline_keyboard: [
            [
              {
                text: 'Verify Now ↗',
                url: verificationUrl
              }
            ]
          ]
        };

        await ctx.telegram.sendMessage(ctx.from.id, 
          'Hello! To join the group, please verify yourself by clicking the button below:',
          {
            reply_markup: inlineKeyboard
          }
        );
        console.log(`Verification message sent to user: ${ctx.from.id}`);
      } catch (error) {
        console.error('Error in chat_join_request handler:', error);
      }
    });

    console.log('Handling update');
    await bot.handleUpdate(req.body);
    console.log('Update handled successfully');

    res.status(200).json({ message: 'Success' });
  } catch (error) {
    console.error('Error in bot handler:', error);
    // Instead of sending a 500 error, send a 200 OK to prevent Telegram from retrying
    res.status(200).json({ error: 'Failed to process update', details: error.message });
  }
}