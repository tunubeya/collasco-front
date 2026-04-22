import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LandingContent from '@/ui/components/landing/landing-content.client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing');

  return {
    title: t('metadata_title'),
    description: t('comingSoon.description')
  };
}

export default async function LandingPage() {
  const t = await getTranslations('landing');
  
  const translations = {
    hero: { 
      tagline: t('hero.tagline'), 
      title: t('hero.title'), 
      description: t('hero.description')
    },
    vision: {
      label: t('vision.label'),
      title: t('vision.title'),
      description1: t('vision.description1'),
      description2: t('vision.description2')
    },
    differentiators: {
      label: t('differentiators.label'),
      title: t('differentiators.title'),
      description: t('differentiators.description'),
      items: {
        jira: {
          tool: t('differentiators.items.jira.tool'),
          challenge: t('differentiators.items.jira.challenge'),
          edge: t('differentiators.items.jira.edge')
        },
        notion: {
          tool: t('differentiators.items.notion.tool'),
          challenge: t('differentiators.items.notion.challenge'),
          edge: t('differentiators.items.notion.edge')
        },
        linear: {
          tool: t('differentiators.items.linear.tool'),
          challenge: t('differentiators.items.linear.challenge'),
          edge: t('differentiators.items.linear.edge')
        }
      }
    },
    personas: {
      label: t('personas.label'),
      title: t('personas.title'),
      description: t('personas.description'),
      items: {
        productManagers: { title: t('personas.items.productManagers.title'), description: t('personas.items.productManagers.description') },
        developers: { title: t('personas.items.developers.title'), description: t('personas.items.developers.description') },
        customers: { title: t('personas.items.customers.title'), description: t('personas.items.customers.description') },
        qualityTeams: { title: t('personas.items.qualityTeams.title'), description: t('personas.items.qualityTeams.description') }
      }
    },
    features: {
      label: t('features.label'),
      title: t('features.title'),
      description: t('features.description'),
      ai: {
        title: t('features.ai.title'),
        description: t('features.ai.description'),
        example: t('features.ai.example')
      },
      clusters: {
        captureAlign: {
          title: t('features.clusters.captureAlign.title'),
          items: {
            supportTickets: { title: t('features.clusters.captureAlign.items.supportTickets.title'), description: t('features.clusters.captureAlign.items.supportTickets.description'), example: t('features.clusters.captureAlign.items.supportTickets.example') },
            structuredCommunication: { title: t('features.clusters.captureAlign.items.structuredCommunication.title'), description: t('features.clusters.captureAlign.items.structuredCommunication.description'), example: t('features.clusters.captureAlign.items.structuredCommunication.example') }
          }
        },
        validateControl: {
          title: t('features.clusters.validateControl.title'),
          items: {
            testingWorkflows: { title: t('features.clusters.validateControl.items.testingWorkflows.title'), description: t('features.clusters.validateControl.items.testingWorkflows.description'), example: t('features.clusters.validateControl.items.testingWorkflows.example') },
            reviewApprovals: { title: t('features.clusters.validateControl.items.reviewApprovals.title'), description: t('features.clusters.validateControl.items.reviewApprovals.description'), example: t('features.clusters.validateControl.items.reviewApprovals.example') },
            changeControl: { title: t('features.clusters.validateControl.items.changeControl.title'), description: t('features.clusters.validateControl.items.changeControl.description'), example: t('features.clusters.validateControl.items.changeControl.example') }
          }
        },
        documentDeliver: {
          title: t('features.clusters.documentDeliver.title'),
          items: {
            versionDocs: { title: t('features.clusters.documentDeliver.items.versionDocs.title'), description: t('features.clusters.documentDeliver.items.versionDocs.description'), example: t('features.clusters.documentDeliver.items.versionDocs.example') },
            manuals: { title: t('features.clusters.documentDeliver.items.manuals.title'), description: t('features.clusters.documentDeliver.items.manuals.description'), example: t('features.clusters.documentDeliver.items.manuals.example') }
          }
        }
      }
    },
    promise: {
      label: t('promise.label'),
      title: t('promise.title'),
      description: t('promise.description')
    },
    cta: {
      tryPlatform: t('cta.tryPlatform'),
      joinBeta: t('cta.joinBeta'),
      becomeEarlyAdopter: t('cta.becomeEarlyAdopter'),
      scheduleEmailSubject: t('cta.scheduleEmailSubject'),
      scheduleEmailBody: t('cta.scheduleEmailBody')
    },
    stayConnected: {
      label: t('stayConnected.label'),
      title: t('stayConnected.title'),
      description: t('stayConnected.description'),
      integrationsLabel: t('stayConnected.integrationsLabel'),
      integrationsValue: t('stayConnected.integrationsValue')
    },
    footer: {
      copyright: t('footer.copyright'),
      contactLabel: t('footer.contactLabel')
    }
  };

  const scheduleMeetingUrl =
    process.env.NEXT_PUBLIC_SCHEDULE_MEETING_URL ??
    `mailto:daniel@orderflow.be?subject=${encodeURIComponent(
      t('cta.scheduleEmailSubject')
    )}&body=${encodeURIComponent(t('cta.scheduleEmailBody'))}`;

  return <LandingContent translations={translations} scheduleMeetingUrl={scheduleMeetingUrl} />;
}
