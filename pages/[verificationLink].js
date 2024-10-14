import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Reclaim } from '@reclaimprotocol/js-sdk';
import dbConnect from '../lib/dbConnect';
import Verification from '@/models/Verification';

export default function VerificationPage({ verification }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [proofStatus, setProofStatus] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const { sessionId } = router.query;
    if (sessionId) {
      console.log('Session ID:', sessionId);
      setSessionId(sessionId);
      pollStatus(sessionId);
    }
  }, [router.query]);

  const pollStatus = async (sessionId) => {
    const statusUrl = `https://api.reclaimprotocol.org/api/sdk/session/${sessionId}`;
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(statusUrl);
        const data = await response.json();
        console.log('Status response:', data);
        if (data.status === 'SUCCESFULL' && data.proof) {
          clearInterval(pollInterval);
          setProofStatus('success');
          await handleSuccess(data.proof);
        } else if (data.status === 'FAILED') {
          clearInterval(pollInterval);
          setProofStatus('failed');
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleSuccess = async (proof) => {
    try {
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
    } catch (error) {
      console.error('Error handling success:', error);
      alert('Error completing verification. Please try again.');
    }
    setIsVerifying(false);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const APP_ID = process.env.NEXT_PUBLIC_APP_ID;
      const APP_SECRET = process.env.NEXT_PUBLIC_APP_SECRET;
      const reclaimClient = new Reclaim.ProofRequest(APP_ID);
      const redirectUrl = `https://reval-v2.vercel.app/${verification.verificationLink}`;
      reclaimClient.setRedirectUrl(`${redirectUrl}?sessionId={sessionId}`);
      await reclaimClient.buildProofRequest(process.env.NEXT_PUBLIC_APP_PROVIDER, true, 'V2Linking');
      reclaimClient.setSignature(await reclaimClient.generateSignature(APP_SECRET));
      
      const { requestUrl } = await reclaimClient.createVerificationRequest();
      
      // Redirect the user to the Reclaim verification page
      window.location.href = requestUrl;
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
      {sessionId && proofStatus === null && (
        <p>Verification in progress. Please wait...</p>
      )}
      {proofStatus === 'success' && (
        <p>Verification successful! You can now join the group.</p>
      )}
      {proofStatus === 'failed' && (
        <>
          <p>Verification failed. Please try again.</p>
          <button className='mt-4 bg-black text-white px-4 py-2 rounded-lg' onClick={handleVerify}>
            Retry Verification
          </button>
        </>
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
  };
}