import StorePreview from '@/components/layout/StorePreview'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: "Store Preview",
  description:
    "Preview your restaurant's digital storefront as it appears to customers. Check your menu layout, branding, and item availability before going live.",
  // We keep the preview private to prevent search engines from indexing a duplicate or unfinished version of the store
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Live Store Preview | munchspace",
    description: "See how your restaurant looks to the world on munchspace.",
    url: "https://vendor.munchspace.io/restaurant/dashboard/store-preview",
  },
};

const PreviewStore = () => {
  return (
      <div className='mt-12 md:mt-0'>
          <StorePreview />
    </div>
  )
}

export default PreviewStore