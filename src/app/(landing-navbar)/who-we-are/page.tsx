import type { Metadata } from 'next';
import WhoWeAreContent from '@/ui/components/landing/who-we-are.client';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Who We Are | Collasco',
    description: 'We are a product team building structured collaboration tools for software delivery.'
  };
}

export default function WhoWeArePage() {
  return <WhoWeAreContent />;
}