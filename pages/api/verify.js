import dbConnect from '../../lib/dbConnect';
import Verification from '../../models/Verification';
import bot from '../../lib/botClient';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    await dbConnect();

    const { verificationLink } = req.body;

    try {
      const verification = await Verification.findOne({ verificationLink });

      if (!verification) {
        return res.status(404).json({ error: 'Verification not found' });
      }

      if (verification.verificationStatus) {
        return res.status(400).json({ error: 'Already verified' });
      }

      verification.verificationStatus = true;
      await verification.save();

      // Add user to the group
      await bot.telegram.approveChatJoinRequest(verification.groupId, verification.memberId);

      res.status(200).json({ message: 'Verification successful' });
    } catch (error) {
      console.error('Error in verify handler:', error);
      res.status(500).json({ error: 'Failed to verify' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}