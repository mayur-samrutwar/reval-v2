import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Reclaim } from '@reclaimprotocol/js-sdk';
import dbConnect from '../lib/dbConnect';
import Verification from '@/models/Verification';

export default function VerificationPage({ verification }) {
  const [isVerifying, setIsVerifying] = useState(false);
  const router = useRouter();

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const APP_ID = process.env.NEXT_PUBLIC_APP_ID
      const APP_SECRET = process.env.NEXT_PUBLIC_APP_SECRET
      const reclaimClient = new Reclaim.ProofRequest(APP_ID);
      await reclaimClient.buildProofRequest(process.env.NEXT_PUBLIC_APP_PROVIDER, true, 'V2Linking');
      reclaimClient.setSignature(await reclaimClient.generateSignature(APP_SECRET));
      const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/${verification.verificationLink}`;
      // reclaimClient.setRedirectUrl(redirectUrl);
      
      const { requestUrl } = await reclaimClient.createVerificationRequest();
      
      await reclaimClient.startSession({
        onSuccessCallback: async (proof) => {
          console.log('Verification success', proof);
          // Complete verification and add user to group
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
        onFailureCallback: (error) => {
          console.error('Verification failed', error);
          alert('Verification failed. Please try again.');
          setIsVerifying(false);
        }
      });

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
      {!verification.verificationStatus && (
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
  };
}