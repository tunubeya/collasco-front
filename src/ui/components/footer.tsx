import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const socialMedia = [
  {
    href: 'https://www.linkedin.com/company/myflowcheck/',
    src: 'Icons/linkedin-svgrepo-com.svg',
    alt: 'LinkedIn'
  },
  {
    href: 'mailto:contact@myflowcheck.com',
    src: 'Icons/gmail-svgrepo-com.svg',
    alt: 'Email'
  }
];

export default function Footer() {
  const t = useTranslations('ui.footer');
  return (
    <footer className="bg-gradient-to-b from-gray-900 to-blue-900 text-white py-6">
      <div className="max-w-7xl mx-auto px-8 md:px-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="mb-8 md:mb-0">
            <p className="text-sm mb-4">{t('rights')}</p>
            <div className="flex flex-col md:flex-row gap-4 text-sm">
              <Link href="/privacy-policies" className="hover:text-blue-300 transition-colors">
                {t('privacy')}
              </Link>
              <Link href="/terms-and-conditions" className="hover:text-blue-300 transition-colors">
                {t('terms')}
              </Link>
              <Link href="/about" className="hover:text-blue-300 transition-colors">
                About
              </Link>
              <Link href="/support" className="hover:text-blue-300 transition-colors">
                Support
              </Link>
            </div>
          </div>
          <div className="text-right">
            <h4 className="font-semibold mb-4">{t('connect')}</h4>
            <div className="flex gap-4">
              {socialMedia.map(({ href, src, alt }) => (
                <Link
                  key={alt}
                  href={href}
                  className="w-10 h-10 bg-background/10 rounded-full flex items-center justify-center hover:bg-blue-500/30 transition-colors"
                >
                  <Image src={src} alt={alt} width={24} height={24} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
