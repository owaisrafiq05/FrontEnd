import {
  FaUsers,
  FaLayerGroup,
  FaHandshake,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useEffect, useState } from "react";
import { CustomReportData } from "../../../types";
import { t } from '../../../i18n';
import { formatSubcategoryName } from "../../../utils/helperFunctions";


interface CategoryItem {
  type: "predefined" | "custom";
  value: string;
}

interface SetAttributeStepProps {
  formData: CustomReportData;
  errors?: {
    target_population?: string;
    target_income?: string;
    competition?: string;
    complementary?: string;
  };
  onInputChange: (field: string, value: number | string | string[]) => void;
  disabled?: boolean;
  inputCategories: string[];
}

const INCOME_OPTIONS = ["Low", "Medium", "High"];

const SetAttributeStep = ({
  formData,
  errors = {},
  onInputChange,
  disabled = false,
  inputCategories,
}: SetAttributeStepProps) => {
  const [age, setTargetAge] = useState<number>(formData.target_age || 0);
  const [targetIncome, setTargetIncome] = useState<string>(
    formData.target_income_level || "",
  );

  const [searchComplementary, setSearchComplementary] = useState("");
  const [searchCompetition, setSearchCompetition] = useState("");
  const [searchCross, setSearchCross] = useState("");

  const [selectedComplementary, setSelectedComplementary] = useState<
    CategoryItem[]
  >([]);
  const [selectedCompetition, setSelectedCompetition] = useState<
    CategoryItem[]
  >([]);
  const [selectedCross, setSelectedCross] = useState<CategoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [complementaryError, setComplementaryError] = useState<string | null>(
    null,
  );
  const [competitionError, setCompetitionError] = useState<string | null>(null);
  const [crossError, setCrossError] = useState<string | null>(null);

  // Helper: Parse API format to internal CategoryItem format
  const parseFromApiFormat = (categories: string[]): CategoryItem[] => {
    return categories.map((cat) => {
      // Check if it's a custom keyword (wrapped with @)
      if (cat.startsWith("@") && cat.endsWith("@") && cat.length > 2) {
        const cleanValue = cat.slice(1, -1)
        return {
          type: "custom",
          value: cleanValue,
        };
      }
      return {
        type: "predefined",
        value: cat,
      };
    });
  };

  // Helper: Transform internal format to API format
  const transformToApiFormat = (items: CategoryItem[]): string[] => {
    return items.map((item) => {
      if (item.type === "custom") {
        return `@${item.value}@`;
      }
      return item.value;
    });
  };

  const validateKeywordInput = (
    value: string,
  ): { valid: boolean; error?: string } => {
    const trimmed = value.trim();

    if (trimmed.length < 2) {
      return { valid: false, error: t("keyword-must-be-at-least-2-characters") };
    }

    if (trimmed.length > 50) {
      return { valid: false, error: t("keyword-must-be-at-most-50-characters") };
    }

    return { valid: true };
  };

  const getSearchableCategoryStrings = (category: string): string[] => {
    const localized = formatSubcategoryName(category);
    return [category, localized];
  };

  const findMatchingPredefinedCategory = (value: string): string | undefined => {
    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) return undefined;

    return categories.find(category =>
      getSearchableCategoryStrings(category).some(candidate =>
        candidate.toLowerCase() === normalizedValue
      )
    );
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    searchValue: string,
    sectionKey: string,
    selectedItems: CategoryItem[],
    setSelectedItems: React.Dispatch<React.SetStateAction<CategoryItem[]>>,
    setSearchValue: React.Dispatch<React.SetStateAction<string>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
  ) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    setError(null);

    const sanitized = searchValue.trim().replace(/^@+|@+$/g, "");

    if (!sanitized) {
      setError(t("please-enter-a-keyword"));
      return;
    }

    const validation = validateKeywordInput(sanitized);
    if (!validation.valid) {
      setError(validation.error || t("invalid-keyword"));
      return;
    }

    const isDuplicate = selectedItems.some(
      (item) => item.value.toLowerCase() === sanitized.toLowerCase(),
    );

    if (isDuplicate) {
      setError(t("this-keyword-is-already-added"));
      return;
    }

    const matchedCategory = findMatchingPredefinedCategory(sanitized);

    let newItem: CategoryItem;

    if (matchedCategory) {
      // Add as predefined category
      newItem = {
        type: "predefined",
        value: matchedCategory,
      };
    } else {
      // Add as custom keyword
      newItem = {
        type: "custom",
        value: sanitized,
      };
    }

    // Update state
    const updatedItems = [...selectedItems, newItem];
    setSelectedItems(updatedItems);

    // Transform and send to parent
    onInputChange(sectionKey, transformToApiFormat(updatedItems));

    // Clear search input
    setSearchValue("");
  };

  useEffect(() => {
    if (formData) {
      setSelectedCompetition(
        parseFromApiFormat([
          ...new Set(formData?.competition_categories ?? []),
        ]),
      );
      setSelectedComplementary(
        parseFromApiFormat([
          ...new Set(formData?.complementary_categories ?? []),
        ]),
      );
      setSelectedCross(
        parseFromApiFormat([
          ...new Set(formData?.cross_shopping_categories ?? []),
        ]),
      );
    }
  }, [formData]);

  useEffect(() => {
    setCategories(inputCategories);
  }, [inputCategories]);

  const onAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    onInputChange("target_age", value);
    setTargetAge(value);
  };

  const getOrderedCategories = (
    query: string,
    categories: string[],
    selected: CategoryItem[],
  ): CategoryItem[] => {
    const normalizedQuery = query.toLowerCase();
    const filtered = categories.filter((cat) =>
      getSearchableCategoryStrings(cat).some(searchable =>
        searchable.toLowerCase().includes(normalizedQuery)
      ),
    );

    const predefinedItems: CategoryItem[] = filtered.map((cat) => ({
      type: "predefined",
      value: cat,
    }));

    const selectedPredefined = predefinedItems.filter((item) =>
      selected.some((s) => s.value === item.value && s.type === "predefined"),
    );
    const unselectedPredefined = predefinedItems.filter(
      (item) =>
        !selected.some(
          (s) => s.value === item.value && s.type === "predefined",
        ),
    );

    const customKeywords = selected.filter((item) => item.type === "custom");
    return  [...customKeywords, ...selectedPredefined, ...unselectedPredefined];
  };

  const toggleSelection = (
    key: string,
    item: CategoryItem,
    setSelected: React.Dispatch<React.SetStateAction<CategoryItem[]>>,
    selected: CategoryItem[],
  ) => {
    const isSelected = selected.some((s) => s.value === item.value);

    const updated = isSelected
      ? selected.filter((s) => s.value !== item.value)
      : [...selected, item];

    setSelected(updated);
    onInputChange(key, transformToApiFormat(updated));
  };

  // Chip selector handler
  const handleTagSelect = (
    setSelected: React.Dispatch<React.SetStateAction<string>>,
    field: string,
    value: string,
  ) => {
    const updated = value;

    setSelected(updated);
    onInputChange(field, updated.toLowerCase());
  };

  return (
    <div className="animate-fade-in-up h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{t("set-attributes")}</h3>
        <p className="text-sm text-gray-600">{t("define-demographics-competition-and-complementary-business-attributes")}</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-4 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Demographics Section */}
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-4 flex flex-col overflow-hidden max-h-[60vh]">
          <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center flex-shrink-0">
            <FaUsers className="w-4 h-4 me-2 text-primary" />{t("demographics")}</h4>
          {/* Population Counter */}
          <div className="mb-3 flex-shrink-0">
            <div className="flex flex-col">
              <label htmlFor="age" className="text-gray-900 font-semibold text-sm mb-2">{t("age")}</label>
              <input
                type="number"
                id="age"
                value={age}
                onChange={onAgeChange}
                className="w-full px-3 py-2 border-2 rounded-lg text-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary border-gray-200"
              />
            </div>
          </div>
          {/* Income Chips */}
          <div className="flex flex-col flex-shrink-0">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t("target-income-range")}</label>
            <div className="flex flex-wrap gap-2">
              {INCOME_OPTIONS.map(option => {
                const value = option.toLowerCase();
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleTagSelect(setTargetIncome, 'target_income_level', value)}
                    className={`px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-all duration-200 ${targetIncome.includes(value)
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:text-primary'
                      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {errors.target_income && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <FaExclamationTriangle className="w-4 h-4 me-1" />
                {errors.target_income}
              </p>
            )}
          </div>
        </div>

        {/* Complementary Section */}
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-4 flex flex-col overflow-hidden max-h-[60vh]">
          <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center flex-shrink-0">
            <FaHandshake className="w-4 h-4 me-2 text-primary" />{t("complementary")}</h3>

          <input
            type="text"
            placeholder={t("search-categories-or-add-custom-keyword")}
            value={searchComplementary}
            onChange={(e) => setSearchComplementary(e.target.value)}
            onKeyDown={(e) =>
              handleKeyDown(
                e,
                searchComplementary,
                "complementary_categories",
                selectedComplementary,
                setSelectedComplementary,
                setSearchComplementary,
                setComplementaryError,
              )
            }
            disabled={disabled}
            className={`w-full border-2 rounded-xl px-3 py-2 mb-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 outline-none ${
              disabled
                ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-60"
                : "border-gray-200 hover:border-gray-300"
            }`}
          />

          {searchComplementary.trim() &&
            !findMatchingPredefinedCategory(searchComplementary.trim()) && (
              <div className="text-xs text-blue-600 mb-2 px-3">{t("press-enter-to-add")}{searchComplementary.trim().replace(/^@+|@+$/g, "")}{t("as-custom-keyword")}</div>
            )}

          {complementaryError && (
            <div className="text-xs text-red-600 mb-2 px-3 flex items-center">
              <FaExclamationTriangle className="me-1" />
              {complementaryError}
            </div>
          )}

          <div className="flex flex-wrap gap-1 max-h-52 overflow-y-auto pe-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {getOrderedCategories(
              searchComplementary,
              inputCategories,
              selectedComplementary,
            ).map((item: CategoryItem) => {
              const isSelected = selectedComplementary.some(
                (s) => s.value === item.value,
              );

              return (
                <span
                  key={item.value}
                  onClick={() =>
                    !disabled &&
                    toggleSelection(
                      "complementary_categories",
                      item,
                      setSelectedComplementary,
                      selectedComplementary,
                    )
                  }
                  className={`px-2.5 py-1 text-sm rounded-full cursor-pointer border-2 transition-all ${
                    item.type === "custom"
                      ? isSelected
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400"
                      : isSelected
                        ? "bg-primary text-white border-primary"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:border-primary hover:text-primary"
                  } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {item.type === "predefined" ? formatSubcategoryName(item.value) : item.value}
                </span>
              );
            })}
          </div>
        </div>

        {/* Competition Section */}
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-4 flex flex-col overflow-hidden max-h-[60vh]">
          <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center flex-shrink-0">
            <FaLayerGroup className="w-4 h-4 me-2 text-primary" />{t("competition")}</h3>

          <input
            type="text"
            placeholder={t("search-categories-or-add-custom-keyword")}
            value={searchCompetition}
            onChange={(e) => setSearchCompetition(e.target.value)}
            onKeyDown={(e) =>
              handleKeyDown(
                e,
                searchCompetition,
                "competition_categories",
                selectedCompetition,
                setSelectedCompetition,
                setSearchCompetition,
                setCompetitionError,
              )
            }
            disabled={disabled}
            className={`w-full border-2 rounded-xl px-3 py-2 mb-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 outline-none ${
              disabled
                ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-60"
                : "border-gray-200 hover:border-gray-300"
            }`}
          />

          {searchCompetition.trim() &&
            !findMatchingPredefinedCategory(searchCompetition.trim()) && (
              <div className="text-xs text-blue-600 mb-2 px-3">{t("press-enter-to-add")}{searchCompetition.trim().replace(/^@+|@+$/g, "")}{t("as-custom-keyword")}</div>
            )}

          {competitionError && (
            <div className="text-xs text-red-600 mb-2 px-3 flex items-center">
              <FaExclamationTriangle className="me-1" />
              {competitionError}
            </div>
          )}

          <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pe-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {getOrderedCategories(
              searchCompetition,
              inputCategories,
              selectedCompetition,
            ).map((item: CategoryItem) => {
              const isSelected = selectedCompetition.some(
                (s) => s.value === item.value,
              );

              return (
                <span
                  key={item.value}
                  onClick={() =>
                    !disabled &&
                    toggleSelection(
                      "competition_categories",
                      item,
                      setSelectedCompetition,
                      selectedCompetition,
                    )
                  }
                  className={`px-3 py-1 text-sm rounded-full cursor-pointer border-2 transition-all ${
                    item.type === "custom"
                      ? isSelected
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400"
                      : isSelected
                        ? "bg-primary text-white border-primary"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:border-primary hover:text-primary"
                  } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {item.type === "predefined" ? formatSubcategoryName(item.value) : item.value}
                </span>
              );
            })}
          </div>
        </div>

        {/* Cross Shopping Section */}
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-4 flex flex-col overflow-hidden max-h-[60vh]">
          <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center flex-shrink-0">
            <FaUsers className="w-4 h-4 me-2 text-primary" />{t("cross-shopping")}</h3>

          <input
            type="text"
            placeholder={t("search-categories-or-add-custom-keyword")}
            value={searchCross}
            onChange={(e) => setSearchCross(e.target.value)}
            onKeyDown={(e) =>
              handleKeyDown(
                e,
                searchCross,
                "cross_shopping_categories",
                selectedCross,
                setSelectedCross,
                setSearchCross,
                setCrossError,
              )
            }
            disabled={disabled}
            className={`w-full border-2 rounded-xl px-3 py-2 mb-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 outline-none ${
              disabled
                ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-60"
                : "border-gray-200 hover:border-gray-300"
            }`}
          />

          {searchCross.trim() &&
            !findMatchingPredefinedCategory(searchCross.trim()) && (
              <div className="text-xs text-blue-600 mb-2 px-3">{t("press-enter-to-add")}{searchCross.trim().replace(/^@+|@+$/g, "")}{t("as-custom-keyword")}</div>
            )}

          {crossError && (
            <div className="text-xs text-red-600 mb-2 px-3 flex items-center">
              <FaExclamationTriangle className="me-1" />
              {crossError}
            </div>
          )}

          <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pe-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {getOrderedCategories(
              searchCross,
              inputCategories,
              selectedCross,
            ).map((item: CategoryItem) => {
              const isSelected = selectedCross.some(
                (s) => s.value === item.value,
              );

              return (
                <span
                  key={item.value}
                  onClick={() =>
                    !disabled &&
                    toggleSelection(
                      "cross_shopping_categories",
                      item,
                      setSelectedCross,
                      selectedCross,
                    )
                  }
                  className={`px-3 py-1 text-sm rounded-full cursor-pointer border-2 transition-all ${
                    item.type === "custom"
                      ? isSelected
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-400"
                      : isSelected
                        ? "bg-primary text-white border-primary"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:border-primary hover:text-primary"
                  } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {item.type === "predefined" ? formatSubcategoryName(item.value) : item.value}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetAttributeStep;
