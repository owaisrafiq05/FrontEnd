import React from 'react';
import { FaFile } from 'react-icons/fa';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { CustomSegment } from '../../types';
import i18next, { t } from '../../i18n';


interface DetailedSegmentProps {
  segmentReportData: CustomSegment[] | null;
  selectedSegmentId: string | null;
  setSelectedSegmentId: (id: string) => void;
}

function DetailedSegment({
  segmentReportData,
  selectedSegmentId,
  setSelectedSegmentId,
}: DetailedSegmentProps) {
  const [activeTab, setActiveTab] = React.useState<
    'who_they_are' | 'evaluation_metrics' | 'how_they_live'
  >('who_they_are');
  const selectedSegment = segmentReportData?.find(seg => seg.segment_id === selectedSegmentId);

  if (!selectedSegment)
    return (
      <div className="flex items-center justify-center py-16">
        <div className="border rounded-xl px-8 py-10 text-center bg-white  shadow-sm">
          <div className="text-5xl  mb-3">
            <FaFile className="text-center mx-auto text-gray-400" />{' '}
          </div>

          <h3 className="text-xl font-semibold text-neutral-800 ">{t("nothing-here-yet")}</h3>

          <p className="text-sm text-neutral-500 mt-2">{t("this-section-doesn-t-have-any-data-available")}</p>
        </div>
      </div>
    );

  const handlePrevious = () => {
    if (!segmentReportData) return;
    const currentIndex = segmentReportData.findIndex(seg => seg.segment_id === selectedSegmentId);
    if (currentIndex > 0) {
      setSelectedSegmentId(segmentReportData[currentIndex - 1].segment_id);
    }
  };

  const handleNext = () => {
    if (!segmentReportData) return;
    const currentIndex = segmentReportData.findIndex(seg => seg.segment_id === selectedSegmentId);
    if (currentIndex < segmentReportData.length - 1) {
      setSelectedSegmentId(segmentReportData[currentIndex + 1].segment_id);
    }
  };

  return (
    <div className="flex items-start gap-4">
      {/* Left Navigation Button */}
      <button
        onClick={handlePrevious}
        disabled={segmentReportData?.findIndex(seg => seg.segment_id === selectedSegmentId) === 0}
        className="w-[52px] h-[52px] p-3 rounded-full border-2 border-[#582c83] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[#582c83] hover:bg-[#582c83] hover:text-white flex-shrink-0 mt-2"
        type="button"
      >
        <FiChevronLeft className="w-6 h-6" />
      </button>

      {/* Main Content Container - Row Layout */}
      <div className="flex-1 flex gap-6">
        {/* Left Section - Header (1/3 of space) */}
        <div className="w-1/3 flex flex-col px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center bg-[#582c83] text-white font-normal text-2xl py-1.5 px-2 flex-shrink-0">
              {(
                (segmentReportData?.findIndex(seg => seg.segment_id === selectedSegmentId) ?? 0) + 1
              )
                .toString()
                .padStart(2, '0')}
            </div>
            <h2 className="text-2xl font-bold text-[#582c83]">
              {i18next.language === 'ar' ? selectedSegment.name_ar || selectedSegment.name : selectedSegment.name}
            </h2>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            {i18next.language === 'ar' ? selectedSegment.description_ar || selectedSegment.description : selectedSegment.description}
          </p>
        </div>

        {/* Right Section - Tabs and Content (2/3 of space) */}
        <div className="w-2/3 flex flex-col">
          {/* Tabs */}
          <div className="bg-[#f5f5f5] rounded-t-lg overflow-hidden">
            <div className="flex border-b-2 border-gray-100">
              <button
                onClick={() => setActiveTab('who_they_are')}
                className={`flex-1 relative font-semibold text-sm py-4 px-4 border-e-[1px] border-gray-300 transition-all duration-200 ${activeTab === 'who_they_are'
                    ? 'text-[#582c83] bg-[#e3dbea]'
                    : 'text-gray-600 hover:text-[#582c83] hover:bg-gray-50'
                  }`}
                type="button"
              >
                <span className="block">{t("who-they-are")}</span>
                <div
                  className={`absolute bottom-0 start-0 end-0 h-1 bg-[#582c83] transition-transform duration-300 ${activeTab === 'who_they_are' ? 'scale-100' : 'scale-0'
                    }`}
                ></div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('evaluation_metrics')}
                className={`flex-1 relative group font-semibold text-sm py-4 px-4 border-e-[1px] border-gray-300 transition-all duration-200 ${activeTab === 'evaluation_metrics'
                    ? 'text-[#582c83] bg-[#e3dbea]'
                    : 'text-gray-600 hover:text-[#582c83] hover:bg-gray-50'
                  }`}
              >
                <span className="block">{t("evaluation-metrics")}</span>
                <div
                  className={`absolute bottom-0 start-0 end-0 h-1 bg-[#582c83] transition-transform duration-300 ${activeTab === 'evaluation_metrics' ? 'scale-100' : 'scale-0 group-hover:scale-100'
                    }`}
                ></div>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('how_they_live')}
                className={`flex-1 relative group font-semibold text-sm py-4 px-4 transition-all duration-200 ${activeTab === 'how_they_live'
                    ? 'text-[#582c83] bg-[#e3dbea]'
                    : 'text-gray-600 hover:text-[#582c83] hover:bg-gray-50'
                  }`}
              >
                <span className="block">{t("how-they-live")}</span>
                <div
                  className={`absolute bottom-0 start-0 end-0 h-1 bg-[#582c83] transition-transform duration-300 ${activeTab === 'how_they_live' ? 'scale-100' : 'scale-0 group-hover:scale-100'
                    }`}
                ></div>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="py-2 bg-white rounded-b-lg">
            {activeTab ==="who_they_are" && (
              <div>
                {/* Description Section */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="leading-relaxed text-gray-700">
                    {i18next.language === 'ar' ? selectedSegment.description_ar || selectedSegment.description : selectedSegment.description}
                    {' '}{t("this-group-typically-falls-within-the")}{' '}
                    <span className="font-semibold text-gray-900">
                      {selectedSegment.demographic_profile.age_range}
                    </span>{' '}{t("age-range-with-a-household-size-of")}{' '}
                    <span className="font-semibold text-gray-900">
                      {selectedSegment.demographic_profile.household_size}
                    </span>{' '}{t("their-lifestyle-is-described-as")}{' '}
                    <span className="font-semibold text-gray-900">
                      {t(selectedSegment.demographic_profile.lifestyle)}
                    </span>{t("and-they-tend-to-spend-on")}{' '}
                    <span className="font-semibold text-gray-900">
                      {t(selectedSegment.demographic_profile.spending_habits)}
                    </span>
                    .
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Average Household Income */}
                  <div className="bg-gradient-to-br from-white to-purple-50 border border-purple-100 rounded-lg p-4">
                    <div className="text-[#582c83] text-xs font-semibold mb-2 tracking-wide uppercase">{t("average-income")}</div>
                    <div className="text-gray-900 font-bold text-lg capitalize">
                      {t(selectedSegment.demographic_profile.income)}
                    </div>
                  </div>

                  {/* Family Size */}
                  <div className="bg-gradient-to-br from-white to-purple-50 border border-purple-100 rounded-lg p-4">
                    <div className="text-[#582c83] text-xs font-semibold mb-2 tracking-wide uppercase">{t("family-size")}</div>
                    <div className="text-gray-900 font-bold text-lg">
                      {selectedSegment.demographic_profile.household_size}
                    </div>
                  </div>

                  {/* Average Age */}
                  <div className="bg-gradient-to-br from-white to-purple-50 border border-purple-100 rounded-lg p-4">
                    <div className="text-[#582c83] text-xs font-semibold mb-2 tracking-wide uppercase">{t("average-age")}</div>
                    <div className="text-gray-900 font-bold text-lg">
                      {selectedSegment.demographic_profile.age_range}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab ==="evaluation_metrics" && (
              <div>
                <div className="flex gap-2">
                  {Object.entries(selectedSegment.attributes.evaluation_metrics).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="relative bg-gradient-to-br from-white to-gray-50 border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group"
                      >
                        <div className="relative">
                          <div className="text-[#582c83] text-xs font-bold mb-3 tracking-wider uppercase">
                            {t(key)}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <div className="text-4xl font-bold text-gray-900 group-hover:text-[#582c83] transition-colors">
                              {(value * 100).toFixed(0)}
                            </div>
                            <div className="text-sm text-gray-500 font-medium">/ 100</div>
                          </div>
                          <div className="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#582c83] to-[#7a3fa8] h-full rounded-full transition-all duration-500"
                              style={{ width: `${(value * 100).toFixed(0)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {activeTab ==="how_they_live" && (
              <div>
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-[#582c83] mb-2">{t("lifestyle-and-shopping-patterns")}</h3>
                </div>

                <div className="flex gap-2">
                  {selectedSegment.attributes.cross_shopping_categories &&
                    selectedSegment.attributes.cross_shopping_categories.length > 0 && (
                      <div className="bg-gradient-to-br from-white to-blue-50 border-s-4 border-blue-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                              />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-blue-700 font-bold text-base tracking-wide">{t("cross-shopping-categories")}</h4>
                            <p className="text-xs text-gray-600">{t("alternative-shopping-destinations")}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedSegment.attributes.cross_shopping_categories.map(
                            (category, index) => (
                              <span
                                key={index}
                                className="px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                              >
                                {t(category)}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  {selectedSegment.attributes.complementary_categories &&
                    selectedSegment.attributes.complementary_categories.length > 0 && (
                      <div className="bg-gradient-to-br from-white to-green-50 border-s-4 border-green-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                              />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-green-700 font-bold text-base tracking-wide">{t("complementary-categories")}</h4>
                            <p className="text-xs text-gray-600">{t("businesses-that-enhance-the-experience")}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedSegment.attributes.complementary_categories.map(
                            (category, index) => (
                              <span
                                key={index}
                                className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
                              >
                                {t(category)}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Navigation Button */}
      <button
        onClick={handleNext}
        disabled={
          segmentReportData?.findIndex(seg => seg.segment_id === selectedSegmentId) ===
          (segmentReportData?.length ?? 0) - 1
        }
        className="w-[52px] h-[52px] p-3 rounded-full border-2 border-[#582c83] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-[#582c83] hover:bg-[#582c83] hover:text-white flex-shrink-0 mt-2"
        type="button"
      >
        <FiChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}

export default DetailedSegment;
