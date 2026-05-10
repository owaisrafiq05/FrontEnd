import React, { useCallback, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MdClose, MdCheckCircleOutline, MdErrorOutline } from 'react-icons/md';
import { formatSubcategoryName } from '../../../../utils/helperFunctions';
import { useBillingContext, type ReportTier } from '../../../../context/BillingContext';
import { useUIContext } from '../../../../context/UIContext';
import { useAuth, isGuestUser } from '../../../../context/AuthContext';
import apiRequest from '../../../../services/apiRequest';
import urls from '../../../../urls.json';
import i18n, { t } from '../../../../i18n';


const PurchaseSuccessModal = lazy(() => import('./PurchaseSuccessModal'));

interface CheckoutModalProps {
  onClose: () => void;
  cartCostResponse: {
    data?: {
      total_cost?: number;
      intelligence_purchase_items?: Array<{
        user_id: string;
        city_name: string;
        country_name: string;
        cost: number;
        expiration: string | null;
        explanation: string;
        is_currently_owned: boolean;
        free_as_part_of_package: boolean | null;
        intelligence_name: string;
      }>;
      dataset_purchase_items?: Array<{
        user_id: string;
        city_name: string;
        country_name: string;
        cost: number;
        expiration: string | null;
        explanation: string;
        is_currently_owned: boolean;
        free_as_part_of_package: boolean | null;
        dataset_name: string;
        api_calls?: number;
      }>;
      report_purchase_items?: Array<{
        user_id: string;
        city_name: string;
        country_name: string;
        cost: number;
        expiration: string | null;
        explanation: string;
        is_currently_owned: boolean;
        free_as_part_of_package: boolean | null;
        report_tier: string;
        report_potential_business_type?: string;
        description?: string;
        data_variables?: Record<string, string>;
      }>;
    };
  } | null;
  isCalculatingCost: boolean;
  onPurchaseComplete: () => void;
  onRecalculateCart?: (promotionCode?: string) => Promise<void>;
  reportTiers?: ReportTierInfo[];
}

interface ReportTierInfo {
  reportKey: ReportTier;
  name: string;
}

function CheckoutModal({
  onClose,
  cartCostResponse,
  isCalculatingCost,
  onPurchaseComplete,
  onRecalculateCart,
  reportTiers = [],
}: CheckoutModalProps) {
  const navigate = useNavigate();
  const { checkout, dispatch } = useBillingContext();
  const { openModal } = useUIContext();
  const { authResponse } = useAuth();
  const isGuest = !!authResponse && isGuestUser(authResponse);
  const [isPurchasing, setIsPurchasing] = React.useState(false);
  const [promotionCode, setPromotionCode] = React.useState('');
  const [isApplyingPromo, setIsApplyingPromo] = React.useState(false);
  const [promoError, setPromoError] = React.useState<string | null>(null);

  const formatPrice = useCallback(
    (value: number) =>
      `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    []
  );

  const handleIntelligenceToggle = useCallback(
    (intelligenceName: string) => {
      const normalized = intelligenceName.trim().toLowerCase().replace(/\s+/g, '_');
      let formatted: 'Income' | 'Population' | 'Real Estate' | null = null;
      if (normalized === 'population') formatted = 'Population';
      else if (normalized === 'income') formatted = 'Income';
      else if (normalized === 'real_estate' || normalized === 'realestate')
        formatted = 'Real Estate';
      if (formatted) dispatch({ type: 'toggleIntelligence', payload: formatted });
    },
    [dispatch]
  );

  const handleDatasetToggle = useCallback(
    (type: string) => {
      dispatch({ type: 'toggleDataset', payload: type });
    },
    [dispatch]
  );

  const handleReportToggle = useCallback(
    (reportKey: ReportTier) => {
      if (checkout.report === reportKey) {
        dispatch({ type: 'setReport', payload: '' });
      } else {
        dispatch({ type: 'setReport', payload: reportKey });
      }
    },
    [checkout.report, dispatch]
  );

  const handleApplyPromotion = useCallback(async () => {
    if (!promotionCode.trim() || !onRecalculateCart) {
      return;
    }

    setIsApplyingPromo(true);
    setPromoError(null);

    try {
      await onRecalculateCart(promotionCode.trim());
      // Success - error will be cleared and prices updated
    } catch (error) {
      console.error('Failed to apply promotion code:', error);

      let errorMessage = t("invalid-voucher-code");

      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as {
          response?: { data?: { message?: string; detail?: string; error?: string } | string };
        };
        const errorData = apiError.response?.data;

        if (errorData && typeof errorData === 'object') {
          const obj = errorData as Record<string, unknown>;
          const msg =
            typeof obj.message === 'string' ? obj.message :
            typeof obj.detail === 'string' ? obj.detail :
            typeof obj.error === 'string' ? obj.error : null;
          if (msg) errorMessage = msg;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error instanceof Error) {
        const msg = error.message.replace(/\s*\(Status:\s*\d+\)/g, '').trim();
        if (msg && msg !== '[object Object]') errorMessage = msg;
      }

      setPromoError(errorMessage);
    } finally {
      setIsApplyingPromo(false);
    }
  }, [promotionCode, onRecalculateCart]);

  const handlePurchase = useCallback(async () => {
    if (isGuest) {
      onClose();
      navigate('/auth?mode=register');
      return;
    }

    if (!authResponse?.localId) {
      return;
    }

    if (
      checkout.datasets.length === 0 &&
      checkout.intelligences.length === 0 &&
      checkout.report === ''
    ) {
      return;
    }

    setIsPurchasing(true);

    try {
      const requestBody: {
        user_id: string;
        country_name: string;
        city_name: string;
        datasets: string[];
        intelligences: string[];
        displayed_price: number;
        report: string;
        report_potential_business_type: string;
        promotion_code?: string;
      } = {
        user_id: authResponse.localId,
        country_name: checkout.country_name || '',
        city_name: checkout.city_name || '',
        datasets: checkout.datasets,
        intelligences: checkout.intelligences,
        displayed_price: cartCostResponse?.data?.total_cost || 0,
        report: checkout.report || '',
        report_potential_business_type: checkout.report_potential_business_type || '',
      };

      if (promotionCode.trim()) {
        requestBody.promotion_code = promotionCode.trim();
      }

      const response = await apiRequest({
        url: urls.purchase_items,
        method: 'POST',
        body: requestBody,
        isAuthRequest: true,
      });

      const purchaseData = response?.data?.data;

      openModal(
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MdCheckCircleOutline className="text-green-500 text-6xl mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t("payment-successful")}</h2>
              <p className="text-gray-600">{t("loading-details")}</p>
            </div>
          }
        >
          <PurchaseSuccessModal purchaseData={purchaseData} />
        </Suspense>,
        {
          darkBackground: true,
          isSmaller: true,
          hasAutoSize: true,
        }
      );

      onPurchaseComplete();
      onClose();
    } catch (error) {
      console.error('Purchase failed:', error);

      let errorMessage = t("an-error-occurred-while-processing-your-purchase");

      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as {
          response?: { data?: { message?: string; detail?: string; error?: string } | string };
        };
        const errorData = apiError.response?.data;

        if (errorData && typeof errorData === 'object') {
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message.replace(/\s*\(Status:\s*\d+\)/g, '');
      }

      openModal(
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <MdErrorOutline className="text-red-500 text-6xl mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t("payment-failed")}</h2>
          <p className="text-gray-600">{errorMessage}</p>
        </div>,
        {
          darkBackground: true,
          isSmaller: true,
          hasAutoSize: true,
        }
      );
      onClose();
    } finally {
      setIsPurchasing(false);
    }
  }, [isGuest, authResponse?.localId, checkout, cartCostResponse, promotionCode, openModal, onPurchaseComplete, onClose, navigate]);

  const hasApiItems =
    cartCostResponse?.data &&
    ((cartCostResponse.data.intelligence_purchase_items?.length ?? 0) > 0 ||
      (cartCostResponse.data.dataset_purchase_items?.length ?? 0) > 0 ||
      (cartCostResponse.data.report_purchase_items?.length ?? 0) > 0);

  const hasCheckoutItems =
    checkout.datasets.length > 0 || checkout.intelligences.length > 0 || checkout.report !== '';

  const isEmpty = !hasApiItems && !hasCheckoutItems;

  const hasCountryAndCity = !!(checkout.country_name?.trim() && checkout.city_name?.trim());
  const canPurchase =
    !isEmpty &&
    !isGuest &&
    hasCountryAndCity &&
    !!authResponse?.localId;
  const purchaseDisabledReason = isEmpty
    ? null
    : isGuest
      ? 'Please sign in to complete your purchase.'
      : !hasCountryAndCity
        ? 'Please select country and city to continue with your purchase.'
        : null;

  const apiItemCount =
    (cartCostResponse?.data?.intelligence_purchase_items?.length ?? 0) +
    (cartCostResponse?.data?.dataset_purchase_items?.length ?? 0) +
    (cartCostResponse?.data?.report_purchase_items?.length ?? 0);
  const checkoutItemCount =
    checkout.datasets.length + checkout.intelligences.length + (checkout.report ? 1 : 0);
  const totalItems = apiItemCount > 0 ? apiItemCount : checkoutItemCount;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{t("checkout")}</h2>
            <span className="text-sm text-gray-500">
              {totalItems}{' '}{t("item")}{totalItems === 1 || i18n.language === 'ar' ? '' : t("s")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t("close")}
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Guest / location / Support messages */}
          {isGuest ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
              <p className="text-sm text-amber-800 leading-relaxed">{t("you-re-a-guest-user-please")}{' '}
                <Link to="/auth" className="text-[#115740] font-semibold underline hover:no-underline">{t("sign-in-2")}</Link>{' '}{t("to-complete-your-purchase")}</p>
            </div>
          ) : !hasCountryAndCity && hasCheckoutItems ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
              <p className="text-sm text-amber-800 leading-relaxed">{t("please-select-country-and-city-to-continue-with-your-purchase")}</p>
            </div>
          ) : null}
          {!isGuest && hasCountryAndCity ? (
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 mb-6">
              <p className="text-xs text-gray-500 leading-relaxed">{t("questions-we-re-happy-to-help-reach-us-at")}{' '}
                <a href="tel:+966558188632" className="text-[#115740] font-medium hover:underline">
                  +966 (55) 818 - 8632
                </a>
              </p>
            </div>
          ) : null}

          {isEmpty ? (
            <div className="flex flex-col items-center justify-center text-center py-12 text-gray-500">
              <svg
                className="w-24 h-24 text-gray-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <p className="text-lg font-medium">{t("your-cart-is-empty")}</p>
              <p className="text-sm">{t("select-services-from-area-intelligence-datasets-or-reports-to-get-started")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Render items from API response or fallback to checkout state */}
              {hasApiItems ? (
                <>
                  {cartCostResponse?.data?.intelligence_purchase_items
                    ?.filter(item => item.intelligence_name)
                    .map(item => (
                      <div
                        key={item.intelligence_name}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-gray-100 rounded-lg p-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("area")}</span>
                            <span className="text-sm text-gray-300">•</span>
                            <span className="text-sm text-gray-500">
                              {formatSubcategoryName(item.intelligence_name)}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {formatSubcategoryName(item.intelligence_name)}{' '}{t("intelligence")}</h3>
                          <p className="text-sm text-gray-500">
                            {item.explanation.startsWith("New purchase of")
                              ? t("new-purchase-of", { item: formatSubcategoryName(item.intelligence_name) })
                              : item.explanation.startsWith("Dataset '") && item.explanation.endsWith("' purchased")
                              ? t("dataset-purchased", { item: formatSubcategoryName(item.intelligence_name) })
                              : item.explanation}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {item.free_as_part_of_package ? (
                            <span className="text-lg font-semibold text-green-600">{t("free")}</span>
                          ) : (
                            <span className="text-lg font-semibold text-gray-900">
                              {formatPrice(item.cost)}
                            </span>
                          )}
                          <button
                            type="button"
                            className="text-xs text-red-500 hover:text-red-700"
                            onClick={() =>
                              item.intelligence_name &&
                              handleIntelligenceToggle(item.intelligence_name)
                            }
                          >{t("remove")}</button>
                        </div>
                      </div>
                    ))}
                  {cartCostResponse?.data?.dataset_purchase_items
                    ?.filter(item => item.dataset_name)
                    .map(item => (
                      <div
                        key={item.dataset_name}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-gray-100 rounded-lg p-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("dataset-2")}</span>
                            <span className="text-sm text-gray-300">•</span>
                            <span className="text-sm text-gray-500">
                              {formatSubcategoryName(item.dataset_name || '')}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {formatSubcategoryName(item.dataset_name || '')}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {item.explanation.startsWith("New purchase of")
                              ? t("new-purchase-of", { item: formatSubcategoryName(item.dataset_name) })
                              : item.explanation.startsWith("Dataset '") && item.explanation.endsWith("' purchased")
                              ? t("dataset-purchased", { item: formatSubcategoryName(item.dataset_name) })
                              : item.explanation}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {item.free_as_part_of_package ? (
                            <span className="text-lg font-semibold text-green-600">{t("free")}</span>
                          ) : (
                            <span className="text-lg font-semibold text-gray-900">
                              {formatPrice(item.cost)}
                            </span>
                          )}
                          <button
                            type="button"
                            className="text-xs text-red-500 hover:text-red-700"
                            onClick={() => handleDatasetToggle(item.dataset_name)}
                          >{t("remove")}</button>
                        </div>
                      </div>
                    ))}
                  {cartCostResponse?.data?.report_purchase_items?.map((item, index) => {
                    const tierName = item.report_tier
                      ? reportTiers.find(t => t.reportKey === item.report_tier)?.name ||
                        `${item.report_tier.charAt(0).toUpperCase() + item.report_tier.slice(1)} Tier`
                      :"Report";
                    return (
                      <div
                        key={`report-${index}`}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-gray-100 rounded-lg p-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("report-3")}</span>
                            <span className="text-sm text-gray-300">•</span>
                            <span className="text-sm text-gray-500 capitalize">
                              {item.report_tier ||"report"}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {tierName}{' '}{t("report-2")}</h3>
                          <p className="text-sm text-gray-500">
                            {item.explanation.startsWith("New purchase of")
                              ? t("new-purchase-of", { item: tierName })
                              : item.explanation.startsWith("Dataset '") && item.explanation.endsWith("' purchased")
                              ? t("dataset-purchased", { item: tierName })
                              : item.explanation}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-lg font-semibold text-gray-900">
                            {formatPrice(item.cost)}
                          </span>
                          {item.report_tier && (
                            <button
                              type="button"
                              className="text-xs text-red-500 hover:text-red-700"
                              onClick={() => handleReportToggle(item.report_tier as ReportTier)}
                            >{t("remove")}</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  {checkout.intelligences.map(service => (
                    <div
                      key={service}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-gray-100 rounded-lg p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("area")}</span>
                          <span className="text-sm text-gray-300">•</span>
                          <span className="text-sm text-gray-500">{service}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {service}{' '}{t("intelligence")}</h3>
                        <p className="text-sm text-gray-500">
                          {isCalculatingCost ?t("calculating-price") :t("unable-to-calculate-price-please-try-again")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          className="text-xs text-red-500 hover:text-red-700"
                          onClick={() => handleIntelligenceToggle(service)}
                        >{t("remove")}</button>
                      </div>
                    </div>
                  ))}
                  {checkout.datasets.map(dataset => (
                    <div
                      key={dataset}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-gray-100 rounded-lg p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("dataset-2")}</span>
                          <span className="text-sm text-gray-300">•</span>
                          <span className="text-sm text-gray-500">
                            {formatSubcategoryName(dataset)}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {formatSubcategoryName(dataset)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {isCalculatingCost ?t("calculating-price") :t("unable-to-calculate-price-please-try-again")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          className="text-xs text-red-500 hover:text-red-700"
                          onClick={() => handleDatasetToggle(dataset)}
                        >{t("remove")}</button>
                      </div>
                    </div>
                  ))}
                  {checkout.report &&
                    (() => {
                      const tierName =
                        reportTiers.find(t => t.reportKey === checkout.report)?.name ||
                        `${checkout.report.charAt(0).toUpperCase() + checkout.report.slice(1)} Tier`;
                      const needsBusinessType = !checkout.report_potential_business_type?.trim();
                      const needsLocation = !checkout.country_name || !checkout.city_name;
                      let statusMessage = '';
                      if (isCalculatingCost) {
                        statusMessage ="Calculating price...";
                      } else if (needsBusinessType || needsLocation) {
                        statusMessage = needsBusinessType
                          ?"Please select a business type to calculate price."
                          :"Please select country and city to calculate price.";
                      } else {
                        statusMessage ="Unable to calculate price. Please try again.";
                      }
                      return (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-gray-100 rounded-lg p-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t("report-3")}</span>
                              <span className="text-sm text-gray-300">•</span>
                              <span className="text-sm text-gray-500 capitalize">
                                {checkout.report}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {tierName}{' '}{t("report-2")}</h3>
                            <p className="text-sm text-gray-500">
                              {statusMessage}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              className="text-xs text-red-500 hover:text-red-700"
                              onClick={() => handleReportToggle(checkout.report)}
                            >{t("remove")}</button>
                          </div>
                        </div>
                      );
                    })()}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isEmpty && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            {/* Promotion Code Section */}
            <div className="mb-4">
              <label htmlFor="promotion-code" className="block text-sm font-medium text-gray-700 mb-2">{t("promotion-code")}</label>
              <div className="flex gap-2 items-start">
                <div className="flex-1 max-w-xs">
                  <input
                    id="promotion-code"
                    type="text"
                    value={promotionCode}
                    onChange={(e) => {
                      setPromotionCode(e.target.value);
                      setPromoError(null);
                    }}
                    placeholder={t("enter-voucher-code")}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#115740] focus:border-transparent"
                  />
                  {promoError && (
                    <p className="mt-1 text-sm text-red-600">{promoError}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleApplyPromotion}
                  className="bg-[#115740] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#0d4632] transition-all disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                  disabled={!promotionCode.trim() || isApplyingPromo || isCalculatingCost}
                >
                  {isApplyingPromo ?t("applying") :t("apply")}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">{t("subtotal")}</span>
              <span className="text-lg font-semibold text-gray-900">
                {isCalculatingCost
                  ?t("calculating")
                  : cartCostResponse?.data?.total_cost
                    ? formatPrice(cartCostResponse.data.total_cost)
                    : '$0.00'}
              </span>
            </div>
            {purchaseDisabledReason && (
              <p className="text-sm text-amber-700 mb-3" role="status">
                {isGuest ? (
                  <>{t("please")}{' '}
                    <Link to="/auth" className="text-[#115740] font-semibold underline hover:no-underline">{t("sign-in-2")}</Link>{' '}{t("to-complete-your-purchase")}</>
                ) : (
                  purchaseDisabledReason
                )}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >{t("continue-shopping")}</button>
              <button
                type="button"
                onClick={handlePurchase}
                disabled={isPurchasing || isCalculatingCost || !canPurchase}
                className="flex-1 bg-[#115740] text-white py-3 rounded-lg font-semibold hover:bg-[#0d4632] transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isPurchasing ?t("processing") :t("purchase-now")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CheckoutModal;
