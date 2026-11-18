import { HeaderSkeleton, ListSkeleton, LoadingAnnouncement } from "@/components/skeletons";

export default function Loading() {
  return (
    <>
      <LoadingAnnouncement label="Loading episodes" />
      <HeaderSkeleton actions={0} />
      <ListSkeleton rows={6} />
    </>
  );
}
