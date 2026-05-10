import i18next from '../../i18n';
import { CustomSegment, CustomSegmentReportResponse } from '../../types';
import ScrollableSegments from './ScrollableSegments';
import DetailedSegment from './DetailedSegment';
import SegmentReportSkeleton from './SegmentReportSkeleton';

interface SmartSegmentReportProps {
  segmentReportData: CustomSegmentReportResponse | null;
  segmentReportLoading: boolean;
  selectedSegment: CustomSegment | null;
  onSegmentSelect: (id: string | null) => void;
}

function SmartSegmentReport({
  segmentReportData,
  segmentReportLoading,
  selectedSegment,
  onSegmentSelect,
}: SmartSegmentReportProps) {
  const lite_segments =
    (Array.isArray(segmentReportData) ? segmentReportData : [])?.map(segment => ({
      name: i18next.language === 'ar' ? segment.name_ar || segment.name : segment.name,
      icon: segment.icon,
      id: segment.segment_id,
    })) || [];

  if (segmentReportLoading) {
    return <SegmentReportSkeleton />;
  }

  return (
    <div className="px-4  space-y-2 w-full min-w-0 animate-fade-in-up">
      {/* Scrollable Segments */}
      <ScrollableSegments
        segments={lite_segments}
        selectedSegmentId={selectedSegment?.segment_id || null}
        onSegmentSelect={onSegmentSelect}
      />

      {/* Segment Detail Panel */}
      {selectedSegment && (
        <DetailedSegment
          segmentReportData={segmentReportData}
          selectedSegmentId={selectedSegment.segment_id}
          setSelectedSegmentId={onSegmentSelect}
        />
      )}
    </div>
  );
}

export default SmartSegmentReport;
