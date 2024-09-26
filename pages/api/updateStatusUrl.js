import dbConnect from '../../lib/dbConnect';
import Verification from '../../models/Verification';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    await dbConnect();

    const { verificationLink, statusUrl } = req.body;

    try {
      const verification = await Verification.findOneAndUpdate(
        { verificationLink },
        { reclaimStatusUrl: statusUrl },
        { new: true }
      );

      if (!verification) {
        return res.status(404).json({ error: 'Verification not found' });
      }

      res.status(200).json({ message: 'Status URL updated successfully' });
    } catch (error) {
      console.error('Error updating status URL:', error);
      res.status(500).json({ error: 'Failed to update status URL' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}