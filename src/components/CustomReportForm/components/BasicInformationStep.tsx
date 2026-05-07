import { KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaGlobe,
  FaMapMarkerAlt,
  FaBuilding,
  FaExclamationTriangle,
  FaSearch,
  FaPlus,
} from 'react-icons/fa';
import { CITY_OPTIONS } from '../constants';
import { t } from '../../../i18n';
import { formatSubcategoryName } from '../../../utils/helperFunctions';


const formatCategoryName = (category: string): string =>
  formatSubcategoryName(category);

const normalizeValue = (value: string): string => value.trim().replace(/\s+/g, ' ');

interface BasicInformationStepProps {
  formData: {
    country_name: string;
    city_name: string;
    Type: string;
  };
  errors: {
    city_name?: string;
    Type?: string;
  };
  onInputChange: (field: 'city_name' | 'Type', value: string) => void;
  isAdvancedMode: boolean;
  onToggleAdvancedMode: (enabled: boolean) => void;
  disabled?: boolean;
  categories: string[];
}

const BasicInformationStep = ({
  formData,
  errors,
  onInputChange,
  isAdvancedMode,
  onToggleAdvancedMode,
  disabled = false,
  categories,
}: BasicInformationStepProps) => {
  const [categorySearchTerm, setCategorySearchTerm] = useState(formData.Type);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const findExactCategoryMatch = useCallback(
    (value: string): string | undefined => {
      const normalizedValue = normalizeValue(value).toLowerCase();
      if (!normalizedValue) return undefined;

      return categories.find(category => {
        const normalizedCategory = category.toLowerCase();
        const normalizedFormattedCategory = formatCategoryName(category).toLowerCase();
        return (
          normalizedCategory === normalizedValue || normalizedFormattedCategory === normalizedValue
        );
      });
    },
    [categories]
  );

  const getDisplayValue = useCallback(
    (value: string): string => {
      const exactMatch = findExactCategoryMatch(value);
      return exactMatch ? formatCategoryName(exactMatch) : value;
    },
    [findExactCategoryMatch]
  );

  const validateCustomValue = (value: string): { valid: boolean; error?: string } => {
    if (value.length < 2) {
      return { valid: false, error: t("business-type-must-be-at-least-2-characters") };
    }

    if (value.length > 50) {
      return { valid: false, error: t("business-type-must-be-at-most-50-characters") };
    }

    return { valid: true };
  };

  const filteredCategories = useMemo(() => {
    const normalizedSearch = normalizeValue(categorySearchTerm).toLowerCase();

    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter(category => {
      const formattedCategory = formatCategoryName(category).toLowerCase();
      return category.toLowerCase().includes(normalizedSearch) || formattedCategory.includes(normalizedSearch);
    });
  }, [categories, categorySearchTerm]);

  const exactCategoryMatch = findExactCategoryMatch(categorySearchTerm);
  const normalizedSearchTerm = normalizeValue(categorySearchTerm);
  const showAddAction = !!normalizedSearchTerm && !exactCategoryMatch;
  const showNoResultsMessage =
    normalizedSearchTerm.length > 0 && filteredCategories.length === 0 && !showAddAction;
  const displayCategoryValue = useMemo(
    () => getDisplayValue(formData.Type),
    [formData.Type, getDisplayValue]
  );

  useEffect(() => {
    if (!isCategoryDropdownOpen) {
      setCategorySearchTerm(displayCategoryValue);
    }
  }, [displayCategoryValue, isCategoryDropdownOpen]);

  const applyCategoryValue = (value: string) => {
    const normalizedValue = normalizeValue(value);

    if (!normalizedValue) {
      setCategoryError(t("please-enter-a-business-type"));
      return;
    }

    const validation = validateCustomValue(normalizedValue);
    if (!validation.valid) {
      setCategoryError(validation.error || t("invalid-business-type"));
      return;
    }

    const matchedCategory = findExactCategoryMatch(normalizedValue);

    onInputChange('Type', matchedCategory || normalizedValue);
    setCategorySearchTerm(matchedCategory ? formatCategoryName(matchedCategory) : normalizedValue);
    setIsCategoryDropdownOpen(false);
    setCategoryError(null);
  };

  const handleCategorySearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    applyCategoryValue(categorySearchTerm);
  };

  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{t("basic-information")}</h3>
        <p className="text-sm text-gray-600">{t("let-s-start-with-the-basic-details-for-your-expansion-report")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Country (readonly) */}
        <div className="space-y-3">
          <label htmlFor="country_name" className="block text-sm font-semibold text-gray-700">
            <span className="flex items-center">
              <FaGlobe className="w-4 h-4 me-2 text-primary" />{t("country")}</span>
          </label>
          <input
            type="text"
            id="country_name"
            value={formData.country_name}
            readOnly
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
          />
        </div>

        {/* City Selection */}
        <div className="space-y-3">
          <label htmlFor="city_name" className="block text-sm font-semibold text-gray-700">
            <span className="flex items-center">
              <FaMapMarkerAlt className="w-4 h-4 me-2 text-primary" />{t("city")}<span className="text-red-500 ms-1">*</span>
            </span>
          </label>
          <select
            id="city_name"
            value={formData.city_name}
            onChange={e => onInputChange('city_name', e.target.value)}
            disabled={disabled}
            className={`w-full px-4 py-3 border-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 ${
              disabled
                ? 'bg-gray-100 cursor-not-allowed opacity-60'
                : errors.city_name
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300 hover:border-primary/50 bg-white'
            }`}
          >
            {CITY_OPTIONS.map(city => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          {errors.city_name && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="w-4 h-4 me-1" />
              {errors.city_name}
            </p>
          )}
        </div>
      </div>

      {/* Type Selection */}
      <div className="space-y-3">
        <label htmlFor="Type" className="block text-sm font-semibold text-gray-700">
          <span className="flex items-center">
            <FaBuilding className="w-4 h-4 me-2 text-primary" />{t("what-kind-of-business-are-you-looking-to-expand")}</span>
        </label>

        <div className="space-y-3">
          <div className="relative">
            <FaSearch className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              id="Type"
              placeholder={t("search-categories-or-enter-a-custom-business-type")}
              value={categorySearchTerm}
              onChange={e => {
                setCategorySearchTerm(e.target.value);
                setIsCategoryDropdownOpen(true);
                if (categoryError) {
                  setCategoryError(null);
                }
              }}
              onFocus={() => setIsCategoryDropdownOpen(true)}
              onBlur={() => {
                window.setTimeout(() => {
                  setIsCategoryDropdownOpen(false);
                  setCategorySearchTerm(displayCategoryValue);
                }, 150);
              }}
              onKeyDown={handleCategorySearchKeyDown}
              disabled={disabled}
              className={`w-full ps-10 pe-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 ${
                disabled
                  ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                  : errors.Type
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300 bg-white'
              }`}
            />
          </div>

          {categoryError && (
            <p className="text-sm text-red-600 flex items-center">
              <FaExclamationTriangle className="w-4 h-4 me-1" />
              {categoryError}
            </p>
          )}

          {isCategoryDropdownOpen && normalizedSearchTerm && (
            <div className="space-y-3">
              {showAddAction && (
                <button
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => applyCategoryValue(normalizedSearchTerm)}
                  disabled={disabled}
                  className="w-full flex items-center justify-center px-4 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaPlus className="w-3.5 h-3.5 me-2" />{t("add-2")}{normalizedSearchTerm}"
                </button>
              )}

              {(filteredCategories.length > 0 || showNoResultsMessage) && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl bg-white">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map(category => (
                      <button
                        key={category}
                        type="button"
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => applyCategoryValue(category)}
                        disabled={disabled}
                        className={`w-full text-start px-4 py-3 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors duration-150 ${
                          formData.Type.toLowerCase() === category.toLowerCase()
                            ? 'bg-primary/10 border-s-4 border-primary text-primary font-medium'
                            : 'text-gray-700'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {formatCategoryName(category)}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-center">{t("no-categories-found-matching")}{normalizedSearchTerm}"
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {errors.Type && !categoryError && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <FaExclamationTriangle className="w-4 h-4 me-1" />
            {errors.Type}
          </p>
        )}
      </div>

      {/* Advanced Configuration Toggle */}
      <div className="border-t border-gray-200 pt-4 mt-6">
        <div className="p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">{t("advanced-configuration")}</h4>
              <p id="advanced-config-description" className="text-xs text-gray-600">{t("customize-evaluation-metrics-add-specific-locations-and-set-your-current-positio")}</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <span className="sr-only">{t("enable-advanced-configuration")}</span>
              <button
                type="button"
                onClick={() => onToggleAdvancedMode(!isAdvancedMode)}
                disabled={disabled}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  disabled
                    ? 'bg-gray-200 cursor-not-allowed opacity-60'
                    : isAdvancedMode
                      ? 'bg-primary'
                      : 'bg-gray-300'
                }`}
                aria-label={isAdvancedMode ? t("disable-advanced-configuration") : t("enable-advanced-configuration")}
                aria-pressed={isAdvancedMode}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                    isAdvancedMode ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Clear action button */}
          <button
            type="button"
            onClick={() => onToggleAdvancedMode(!isAdvancedMode)}
            className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isAdvancedMode
                ? 'bg-primary text-white hover:bg-primary/90 focus:ring-primary/20'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary hover:text-primary focus:ring-primary/20'
            }`}
            aria-label={
              isAdvancedMode ? t("advanced-configuration-is-enabled") : t("enable-advanced-configuration")
            }
            aria-describedby="advanced-config-description"
          >
            {isAdvancedMode ?t("advanced-mode-enabled") :t("enable-advanced-configuration")}
          </button>
        </div>

        {isAdvancedMode && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>{t("advanced-mode-enabled-2")}</strong>{' '}{t("you-ll-be-able-to-customize-evaluation-metrics-add-custom-locations-and-set-your")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicInformationStep;
