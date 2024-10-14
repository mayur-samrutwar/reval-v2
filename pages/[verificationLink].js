import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
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
      startSession(sessionId);
    }
  }, [router.query]);

  const startSession = async (sessionId) => {
    const APP_ID = process.env.NEXT_PUBLIC_APP_ID;
    const APP_SECRET = process.env.NEXT_PUBLIC_APP_SECRET;
    const PROVIDER_ID = process.env.NEXT_PUBLIC_APP_PROVIDER;

    try {
      const reclaimProofRequest = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID);
      
      await reclaimProofRequest.startSession({
        onSuccessCallback: (proofs) => {
          console.log('Verification success', proofs);
          setProofStatus('success');
          handleSuccess(proofs);
        },
        onFailureCallback: (error) => {
          console.error('Verification failed', error);
          setProofStatus('failed');
        }
      });
    } catch (error) {
      console.error('Error starting session:', error);
      setProofStatus('failed');
    }
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
      const PROVIDER_ID = process.env.NEXT_PUBLIC_APP_PROVIDER;

      const reclaimProofRequest = await ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID);
      
      const redirectUrl = `https://reval-v2.vercel.app/${verification.verificationLink}`;
      reclaimProofRequest.setRedirectUrl(redirectUrl);

      const requestUrl = await reclaimProofRequest.getRequestUrl();
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
  }
}