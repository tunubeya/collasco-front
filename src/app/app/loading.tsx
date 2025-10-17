import Loader from '@/ui/components/loader';

export default function Loading() {
  return (
    <div className="w-full min-h-dvh bg-linear-to-r from-background to-light-orange flex p-24 justify-around items-center">
      <Loader />
    </div>
  );
}
