import { CardGridSkeleton, HeaderSkeleton, LoadingAnnouncement } from "@/components/skeletons";

export default function Loading() {
  return (
    <>
      <LoadingAnnouncement label="Loading schedules" />
      <HeaderSkeleton />
      <CardGridSkeleton />
    </>
  );
}
