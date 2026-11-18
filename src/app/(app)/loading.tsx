import { HeaderSkeleton, ListSkeleton, LoadingAnnouncement } from "@/components/skeletons";

/** Fallback for any app page: shown instantly on navigation while the route loads. */
export default function Loading() {
  return (
    <>
      <LoadingAnnouncement />
      <HeaderSkeleton />
      <ListSkeleton />
    </>
  );
}
