'use client';
import { Button } from '@/ui/components/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function BackButton() {
  const t = useTranslations('ui.dialog.back-button');
  const goBack = () => {
    // A simple check to see if there's a history to go back to.
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Handle the case where there is no history, maybe show a message.
      console.error('No history to go back to.');
    }
  };
  return (
    <Button variant={'link'} onClick={goBack}>
      <ArrowLeft className="mr-1 h-4 w-4" />
      {t('label')}
    </Button>
  );
}