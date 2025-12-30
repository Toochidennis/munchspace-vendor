import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import React from 'react'

const Error = () => {
  return (
    <div className="flex items-center min-h-screen justify-center">
      <div className="text-center max-w-sm">
        <h1 className="font-rubik text-7xl font-bold">404</h1>
        <h3 className="font-semibold text-lg mt-4">Hmm, page not found</h3>
        <p className="text-sm mt-3">
          This page doesn't exist or was removed, we suggest you return back to
          dashboard
        </p>
        <Link href={"/"} >
          <Button className="bg-munchprimary hover:bg-munchprimaryDark mt-5 cursor-pointer">
            <ArrowLeft />
            <p>Go to Homepage</p>
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default Error