import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getYesterdayDate } from '../../../../utils/helperFunctions';
import { t } from '../../../../i18n';


interface DataVariable {
  key: string;
  description: string;
}

interface SelectedItemData {
  name: string;
  type: 'dataset' | 'intelligence' | 'report';
  description: string;
  dataVariables: DataVariable[];
  price?: number;
  itemKey?: string;
  isCurrentlyOwned?: boolean;
  expiration?: string;
  explanation?: string;
}

interface ItemSelectionViewProps {
  selectedItem: SelectedItemData | null;
  isInCart?: boolean;
  isLoading?: boolean;
  onAddToCart?: () => void;
  onRemoveFromCart?: () => void;
  /** When true, Add to Cart is disabled (e.g. guest or missing country/city). */
  addToCartDisabled?: boolean;
  /** Message shown when Add to Cart is disabled (e.g. "Please sign in" or "Please select country and city"). */
  addToCartMessage?: string;
  /** When true, show a "Sign in" link next to the message (for guest users). */
  showSignInLink?: boolean;
}

function ItemSelectionView({
  selectedItem,
  isInCart,
  isLoading,
  onAddToCart,
  onRemoveFromCart,
  addToCartDisabled = false,
  addToCartMessage,
  showSignInLink = false,
}: ItemSelectionViewProps) {
  const [activeTab, setActiveTab] = useState<'description' | 'dataVariables'>('description');

  if (!selectedItem) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
        <svg
          className="w-24 h-24 text-gray-300 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">{t("no-item-selected")}</h3>
        <p className="text-sm text-gray-500 max-w-md">{t("select-an-item-from-the-side-panel-to-view-details")}</p>
      </div>
    );
  }

  const formatPrice = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-semibold text-gray-900">{selectedItem.name}</h2>
          {isLoading ? (
            <span className="text-lg font-bold text-gray-400 animate-pulse">{t("loading")}</span>
          ) : selectedItem.price !== undefined ? (
            <span
              className={`text-lg font-bold ${selectedItem.price === 0 ? 'text-green-600' : 'text-green-700'}`}
            >
              {selectedItem.price === 0 ?t("already-owned") : formatPrice(selectedItem.price)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 rounded-full">
            {t(selectedItem.type === 'report' ? 'report-2' : selectedItem.type)}
          </span>
          {selectedItem.isCurrentlyOwned && (
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700 bg-green-100 rounded-full">{t("owned")}</span>
          )}
        </div>
        {selectedItem.explanation && (
          <p className="mt-2 text-sm text-gray-600 italic">
            {selectedItem.explanation.startsWith("New purchase of") 
              ? t("new-purchase-of", { item: selectedItem.name })
              : selectedItem.explanation}
          </p>
        )}
        {selectedItem.expiration && (
          <p className="mt-1 text-xs text-gray-500">{t("expires")}{' '}{new Date(selectedItem.expiration).toLocaleDateString()}
          </p>
        )}
        <p className="text-xs">
          <span className="text-gray-500">{t("updated-on")}</span>{' '}
          <span className="text-[#115740] font-medium">{getYesterdayDate()}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('description')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'description'
                ? 'border-[#115740] text-[#115740]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >{t("description")}</button>
          <button
            onClick={() => setActiveTab('dataVariables')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'dataVariables'
                ? 'border-[#115740] text-[#115740]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >{t("data-variables")}{selectedItem.dataVariables.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#115740] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500">{t("loading-item-details")}</p>
          </div>
        ) : activeTab ==="description" ? (
          <div className="prose max-w-none">
            <p
              className="text-gray-700 leading-relaxed whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: selectedItem.description }}
            ></p>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t("available-data-variables")}</h3>
            {selectedItem.dataVariables.length > 0 ? (
              <ul className="space-y-3">
                {selectedItem.dataVariables.map((variable, index) => (
                  <li key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div>
                        <span className="font-semibold text-gray-900">{variable.key}</span>
                        <p className="text-sm text-gray-600 mt-1">{variable.description}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">{t("no-data-variables-available-for-this-item")}</p>
            )}
          </div>
        )}
      </div>

      {/* Cart Action Buttons */}
      {(onAddToCart || onRemoveFromCart) && !isLoading && (
        <div className="border-t border-gray-200 px-6 py-4">
          {isInCart ? (
            <button
              onClick={onRemoveFromCart}
              className="w-full py-3 px-6 bg-red-50 border-2 border-red-500 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-all flex items-center justify-center gap-2"
              key="remove-from-cart"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>{t("remove-from-cart")}</button>
          ) : (
            <div className="w-full space-y-2">
              {addToCartMessage && addToCartDisabled && (
                <p className="text-sm text-amber-700" role="status">
                  {showSignInLink ? (
                    <>{t("please")}{' '}
                      <Link to="/auth" className="text-[#115740] font-semibold underline hover:no-underline">{t("sign-in-2")}</Link>{' '}{t("to-add-items-to-cart")}</>
                  ) : (
                    addToCartMessage
                  )}
                </p>
              )}
              <button
                onClick={onAddToCart}
                disabled={addToCartDisabled}
                className="w-full py-3 px-6 bg-[#115740] text-white font-semibold rounded-lg hover:bg-[#0d4632] transition-all flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
                key="add-to-cart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>{t("add-to-cart")}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ItemSelectionView;
