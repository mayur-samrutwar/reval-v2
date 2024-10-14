import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
import dbConnect from '../lib/dbConnect';
import Verification from '@/models/Verification';

export default function VerificationPage({ verification }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const router = useRouter();

  const APP_ID = process.env.NEXT_PUBLIC_APP_ID;
  const APP_SECRET = process.env.NEXT_PUBLIC_APP_SECRET;
  const PROVIDER_ID = process.env.NEXT_PUBLIC_APP_PROVIDER;

  useEffect(() => {
    const pollStatusUrl = async () => {
      if (sessionId) {
        try {
          const response = await fetch(`https://api.reclaimprotocol.org/api/sdk/session/${sessionId}`);
          const data = await response.json();
          
          if (data.status === 'successful') {
            alert('Verification successful! You can now join the group.');
            router.push('/');
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }
    };

    const intervalId = setInterval(pollStatusUrl, 5000);

    return () => clearInterval(intervalId);
  }, [sessionId, router]);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const reclaimClient = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID, { log: false, acceptAiProviders: true })
      const reclaimClientJson = reclaimClient.toJsonString()
      const sessionId = JSON.parse(reclaimClientJson).sessionId
      setSessionId(sessionId)
      reclaimClient.setRedirectUrl(`https://reval-v2.vercel.app/${verification.verificationLink}/${sessionId}`)

      const requestUrl = await reclaimClient.getRequestUrl()
      window.open(requestUrl)
      await reclaimClient.startSession({
        onSuccess: async (proof) => {
          console.log('Verification success', proof)
          const res = await fetch('/api/completeVerification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              verificationLink: verification.verificationLink,
              proof: proof
            }),
          });
          if (res.ok) {
            alert('Verification successful! You can now join the group.');
            router.push('/');
          } else {
            alert('Error completing verification. Please try again.');
          }
          setIsVerifying(false);
        },
        onError: error => {
          console.error('Verification failed', error)
          console.error('Error handling success:', error);
          alert('Error completing verification. Please try again.');
          setIsVerifying(false);
        }
      })
    } catch (error) {
      console.error('Error starting verification:', error);
      setIsVerifying(false);
      alert('Error starting verification. Please try again.');
    }
  };

  if (!verification) {
    return <div>Verification link not found or expired.</div>;
  }

  return (
    <div className='h-screen bg-white text-black p-10 flex flex-col items-enter'>
      <h1 className='text-2xl font-semibold'>ReVal Verification</h1>
      <p className='mt-4'>Group ID: {verification.groupId}</p>

      <p>Verification Status: {verification.verificationStatus ? 'Verified' : 'Not Verified'}</p>
      <p>Verification Type: via GitHub</p>
      {!verification.verificationStatus && !sessionId && (
        <button className='mt-4 bg-black text-white px-4 py-2 rounded-lg' onClick={handleVerify} disabled={isVerifying}>
          {isVerifying ? 'Verifying...' : 'Verify with Reclaim'}
        </button>
      )}
    </div>
  );
}

export async function getServerSideProps(context) {
  await dbConnect();
  const { verificationLink } = context.params;
  const verification = await Verification.findOne({ verificationLink });
  return {
    props: {
      verification: JSON.parse(JSON.stringify(verification)),
    },
  }
}