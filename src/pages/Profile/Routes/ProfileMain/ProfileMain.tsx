/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import {
  FaTimes,
  FaSignOutAlt,
  FaUser,
  FaEnvelope,
  FaDatabase,
  FaLayerGroup,
  FaBook,
  FaTrash,
  FaCheck,
  FaExternalLinkAlt,
  FaCalendarAlt,
} from 'react-icons/fa';
import { useNavigate } from 'react-router';
import urls from '../../../../urls.json';
import { useAuth } from '../../../../context/AuthContext';
import apiRequest from '../../../../services/apiRequest';
import { UserProfile, PopupInfo } from '../../../../types/allTypesAndInterfaces';
import { useOTP } from '../../../../context/OTPContext';
import { toast } from 'sonner';
import { t } from '../../../../i18n';

const ProfileMain: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>({
    user_id: '',
    username: '',
    email: '',
    account_type: '',
    show_price_on_purchase: false,
    maker: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showPrice, setShowPrice] = useState<boolean | undefined>(false);
  const [error, setError] = useState<Error | null>(null);
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const { isAuthenticated, authResponse, logout } = useAuth();
  const { openOTPModal } = useOTP();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    fetchProfile();
  }, [isAuthenticated, authResponse, navigate]);

  useEffect(() => {
    setPhoneInput(profile.phone || '');
  }, [profile.phone]);

  const fetchProfile = async () => {
    if (!authResponse || !('idToken' in authResponse)) {
      setError(new Error(t("authentication-information-is-missing")));
      setIsLoading(false);
      navigate('/auth');
      return;
    }

    try {
      const res = await apiRequest({
        url: urls.user_profile,
        method: 'POST',
        isAuthRequest: true,
        body: { user_id: authResponse.localId },
      });
      setProfile(res.data.data);
      setShowPrice(res.data.data.show_price_on_purchase);
    } catch (err) {
      console.error('Unexpected error:', err);
      logout();
      setError(new Error(t("an-unexpected-error-occurred-please-try-again")));
      navigate('/auth');
    } finally {
      setIsLoading(false);
    }
  };
  // Helper to format field labels nicely
  const formatLabel = (key: string): string => {
    const slug = key.toLowerCase().replace(/_/g, '-');
    // We check if the translation exists by comparing it with the key
    const translated = t(slug);
    if (translated !== slug) return translated;

    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Bknd', 'Backend')
      .replace('Id', 'ID');
  };

  // Helper to format dates
  const formatDate = (dateString: string): { main: string; relative: string } => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const main = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      let relative = '';
      if (diffDays > 0) {
        relative = t("days-from-now", { count: diffDays });
      } else if (diffDays < 0) {
        relative = t("days-ago", { count: Math.abs(diffDays) });
      } else {
        relative = t("today");
      }

      return { main, relative };
    } catch {
      return { main: dateString, relative: '' };
    }
  };

  // Check if string looks like a date
  const isDateString = (str: string): boolean => {
    return /^\d{4}-\d{2}-\d{2}/.test(str);
  };

  // Check if string looks like a URL or path
  const isLink = (str: string): boolean => {
    return str.startsWith('/') || str.startsWith('http');
  };

  // Check if string looks like a color
  const isColor = (str: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(str);
  };

  // Render a single field value with smart formatting
  const renderFieldValue = (key: string, value: any): JSX.Element => {
    if (value === null || value === undefined) {
      return <span className="text-sm text-gray-700 break-words leading-relaxed">—</span>;
    }

    // Boolean values
    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-600'
        }`}>
          {value ? <FaCheck size={10} /> : <FaTimes size={10} />}
          {value ?t("yes") :t("no")}
        </span>
      );
    }

    // Number values - check for progress
    if (typeof value === 'number') {
      if (key.toLowerCase().includes('progress')) {
        return (
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#115740] to-[#489E46] rounded transition-all duration-500 ease-in-out" 
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-[#115740] min-w-[45px] text-end">{value}%</span>
          </div>
        );
      }
      if (key.toLowerCase().includes('count') || key.toLowerCase().includes('credits')) {
        return <span className="text-sm text-gray-700 break-words leading-relaxed">{value.toLocaleString()}</span>;
      }
      return <span className="text-sm text-gray-700 break-words leading-relaxed">{value}</span>;
    }

    // String values
    if (typeof value === 'string') {
      // Date strings
      if (isDateString(value)) {
        const { main, relative } = formatDate(value);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-gray-700">
              <FaCalendarAlt size={12} className="inline me-1.5 opacity-60" />
              {main}
            </span>
            {relative && <span className="text-xs text-gray-500">{relative}</span>}
          </div>
        );
      }

      // Color values
      if (isColor(value)) {
        return (
          <span className="inline-flex items-center gap-2">
            <span className="w-5 h-5 rounded border-2 border-black/10 shadow-sm" style={{ backgroundColor: value }} />
            <span>{value}</span>
          </span>
        );
      }

      // Links/URLs
      if (isLink(value)) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[#115740] no-underline font-medium inline-flex items-center gap-1.5 transition-all duration-200 hover:text-[#489E46] hover:underline"
          >{t("view-report")}{' '}<FaExternalLinkAlt size={10} />
          </a>
        );
      }

      const slug = value.toLowerCase().replace(/_/g, '-');
      const translated = t(slug);
      return <span className="text-sm text-gray-700 break-words leading-relaxed">{translated !== slug ? translated : value}</span>;
    }

    return <span className="text-sm text-gray-700 break-words leading-relaxed">{String(value)}</span>;
  };

  // Render nested object data
  const renderNestedObject = (data: Record<string, any>): JSX.Element => {
    const entries = Object.entries(data);
    
    if (entries.length === 0) {
      return (
        <div className="text-center py-8 px-4 text-gray-500">
          <div className="text-4xl mb-3 opacity-50">📭</div>
          <div className="text-sm">{t("no-data-available")}</div>
        </div>
      );
    }

    // Check if this is an object with nested report entries (like standard reports)
    const hasNestedReports = entries.every(([, v]) =>
      typeof v === 'object' && v !== null && !Array.isArray(v) && 
      (v.report_link || v.purchase_date)
    );

    if (hasNestedReports) {
      return (
        <div>
          {entries.map(([nestedKey, nestedValue], index) => (
            <div key={nestedKey} className="bg-white border border-[#115740]/12 rounded-xl mb-4 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#f0f7f4] to-[#e8f5e9] border-b border-[#115740]/8 cursor-pointer transition-all duration-200 hover:from-[#e8f5e9] hover:to-[#dcedc8]">
                <h4 className="text-sm font-semibold text-[#115740] m-0">{formatLabel(nestedKey)}</h4>
                <span className="text-xs font-medium text-white bg-[#115740] px-2.5 py-0.5 rounded-xl">#{index + 1}</span>
              </div>
              <div className="p-4">
                {renderDataFields(nestedValue as Record<string, any>)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return renderDataFields(data);
  };

  // Render data fields in a clean format
  const renderDataFields = (data: Record<string, any>): JSX.Element => {
    // Sort entries to show important fields first
    const priorityFields = ['layer_name', 'city_name', 'records_count', 'progress', 'purchase_date', 'expiration_date'];
    const entries = Object.entries(data).sort((a, b) => {
      const aIndex = priorityFields.indexOf(a[0]);
      const bIndex = priorityFields.indexOf(b[0]);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return (
      <>
        {entries.map(([key, value]) => {
          // Skip rendering nested objects here, handle separately
          if (typeof value ==="object" && value !== null && !Array.isArray(value)) {
            return (
              <div key={key} className="bg-white border border-[#115740]/12 rounded-xl mb-4 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#f0f7f4] to-[#e8f5e9] border-b border-[#115740]/8 cursor-pointer transition-all duration-200 hover:from-[#e8f5e9] hover:to-[#dcedc8]">
                  <h4 className="text-sm font-semibold text-[#115740] m-0">{formatLabel(key)}</h4>
                </div>
                <div className="p-4">
                  {renderNestedObject(value)}
                </div>
              </div>
            );
          }

          return (
            <div key={key} className="flex flex-col px-4 py-3 bg-[#f8faf9] rounded-lg mb-3 border border-[#115740]/8 transition-all duration-200 hover:bg-[#f0f7f4] hover:border-[#115740]/15">
              <span className="text-[0.7rem] font-semibold text-[#115740] uppercase tracking-wide mb-1.5">{formatLabel(key)}</span>
              {renderFieldValue(key, value)}
            </div>
          );
        })}
      </>
    );
  };

  const renderValue = (key: string, value: any): JSX.Element => {
    if (value === null || value === undefined) {
      return (
        <div className="text-center py-8 px-4 text-gray-500">
          <div className="text-4xl mb-3 opacity-50">📭</div>
          <div className="text-sm">{t("no-data-available")}</div>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div>
          {value.map((item, index) => (
            <div key={index} className="bg-white border border-[#115740]/12 rounded-xl mb-4 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#f0f7f4] to-[#e8f5e9] border-b border-[#115740]/8 cursor-pointer transition-all duration-200 hover:from-[#e8f5e9] hover:to-[#dcedc8]">
                <h4 className="text-sm font-semibold text-[#115740] m-0">{t("item-2")}{' '}{index + 1}</h4>
              </div>
              <div className="p-4">
                {typeof item ==="object" ? renderNestedObject(item) : renderFieldValue(key, item)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === 'object') {
      return renderNestedObject(value);
    }

    return (
      <div className="flex flex-col px-4 py-3 bg-[#f8faf9] rounded-lg mb-3 border border-[#115740]/8 transition-all duration-200 hover:bg-[#f0f7f4] hover:border-[#115740]/15">
        <span className="text-[0.7rem] font-semibold text-[#115740] uppercase tracking-wide mb-1.5">{formatLabel(key)}</span>
        {renderFieldValue(key, value)}
      </div>
    );
  };

  const handleItemClick = (type: string, name: string, data: any) => {
    setPopupInfo({ type, name, data });
  };

  // Get type icon for modal header
  const getTypeIcon = (type: string): JSX.Element => {
    if (type.includes('layer')) return <FaLayerGroup />;
    if (type.includes('catalog')) return <FaBook />;
    if (type.includes('report') || type.includes('standard')) return <FaBook />;
    if (type.includes('dataset')) return <FaDatabase />;
    return <FaDatabase />;
  };

  // Get type label for modal subtitle
  const getTypeLabel = (type: string): string => {
    if (type.includes('layer')) return t("layer-details");
    if (type.includes('catalog')) return t("catalog-details");
    if (type.includes('report') || type.includes('standard')) return t("report-details");
    if (type.includes('dataset')) return t("dataset-details");
    return t("details");
  };

  const renderPopup = () => {
    if (!popupInfo) return null;

    return (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999] animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) setPopupInfo(null);
        }}
      >
        <div className="bg-gradient-to-br from-white to-[#f8fdf8] p-0 rounded-2xl max-w-[min(600px,90vw)] max-h-[85vh] overflow-hidden relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(17,87,64,0.1)] animate-slide-up">
          <div className="bg-gradient-to-r from-[#115740] to-[#1a7a5a] px-6 py-5 pe-12 relative">
            <button 
              className="absolute top-4 end-4 w-8 h-8 flex items-center justify-center bg-white/15 border-none rounded-lg text-base cursor-pointer text-white transition-all duration-200 hover:bg-white/25 hover:scale-105 active:scale-95" 
              onClick={() => setPopupInfo(null)}
            >
              <FaTimes />
            </button>
            <h3 className="text-white text-lg font-semibold m-0 break-words leading-snug">
              {getTypeIcon(popupInfo.type)} {formatLabel(popupInfo.name)}
            </h3>
            <p className="text-white/75 text-xs mt-1 font-normal">{getTypeLabel(popupInfo.type)}</p>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-[#115740] [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-[#1a7a5a]">
            {renderValue(popupInfo.name, popupInfo.data)}
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (
    title: string,
    icon: JSX.Element,
    items: Record<string, any>,
    type: string
  ) => {
    // Function to handle delete icon click
    const handleDeleteClick = async (
      type: string,
      key: string,
      value: any
    ) => {
      if (type.includes('layer')) {
        await apiRequest({
          url: urls.delete_layer,
          method: 'DELETE',
          isAuthRequest: true,
          body: { user_id: authResponse?.localId, layer_id: value.layer_id },
        });
      } else if (type.includes('catalog')) {
        await apiRequest({
          url: urls.delete_catalog,
          method: 'DELETE',
          isAuthRequest: true,
          body: { user_id: authResponse?.localId, catalog_id: value.catalog_id },
        });
      }
      fetchProfile();
      console.log('Item details:', { type, key, value });
      // You can add your delete logic here
    };

    const titleKey = type.toLowerCase().replace(/_/g, '-');
    const titleTranslated = t(titleKey, { defaultValue: '' });
    const sectionTitle = titleTranslated || title;

    return (
      <div className="mb-5">
        <h3 className="text-xl text-[#006400] mt-5 mb-2.5">
          {icon} {sectionTitle}
        </h3>
        {Object.entries(items).length > 0 ? (
          <ul className="list-none p-0">
            {Object.entries(items).map(([key, value]) => (
              <li key={key} className="flex justify-between items-center px-2.5 py-1.5 mb-1.5 bg-[#f0f8f0] rounded cursor-pointer min-w-0 break-words overflow-wrap-anywhere transition-colors hover:bg-[#d0e8d0]">
                <span 
                  onClick={() => handleItemClick(type, key, value)}
                  className="flex-1 min-w-0 break-words overflow-wrap-anywhere hyphens-auto"
                >
                  {(() => {
                    const rawName = value.layer_name || value.catalog_name || value.name || key;
                    if (typeof rawName === 'string') {
                      const translated = formatLabel(rawName);
                      return translated;
                    }
                    return rawName;
                  })()}
                </span>
                {/* Conditionally render the delete icon */}
                {type.includes("layer") || type.includes("catalog") ? (
                  <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                    <div className="h-5 w-px bg-gray-300" />
                    <FaTrash
                      className="cursor-pointer text-[#ff4d4f] hover:text-[#ff7875]"
                      onClick={() => handleDeleteClick(type, key, value)} // Pass type here
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t("no-item-available", { item: sectionTitle })}</p>
        )}
      </div>
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated) {
    setTimeout(() => navigate('/auth'), 500);
    return null;
  }
  if (isLoading) return <div className="text-lg text-center mt-12 text-[#006400]">{t("loading-profile")}</div>;

  if (error) {
    setTimeout(() => navigate('/auth'), 500);
    return null;
  }

  if (!profile) {
    setTimeout(() => navigate('/auth'), 500);
    return null;
  }

  return (
    <div className="w-full h-full overflow-y-auto lg:px-10 px-4 text-sm">
      <div className="m-5 mx-auto p-5 bg-[#f0f8f0] rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl text-[#006400] mb-5 text-center">{t("user-profile")}</h2>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 bg-[#f44336] text-white border-none rounded cursor-pointer text-base hover:bg-[#d32f2f]"
          >
            <FaSignOutAlt className="me-2" />{' '}{t("logout")}</button>
        </div>
        <div className="bg-white p-5 rounded-lg mb-5">
          <div className="flex items-start mb-2.5">
            <FaUser className="me-2.5 text-[#006400]" />
            <span className="font-bold me-1.5 min-w-[100px]">{t("username")}</span>
            {profile.username}
          </div>
          <div className="flex items-start mb-2.5">
            <FaEnvelope className="me-2.5 text-[#006400]" />
            <span className="font-bold me-1.5 min-w-[100px]">{t("email-2")}</span>
            {profile.email}
          </div>
          <div className="flex items-start mb-2.5">
            <span className="font-bold me-1.5 min-w-[100px]">{t("phone-2")}</span>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center flex-1 gap-2 w-full sm:w-auto">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder={t("enter-phone-number")}
                className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={() => {
                  if (!authResponse || !('idToken' in authResponse)) {
                    setError(new Error(t("authentication-information-is-missing")));
                    return;
                  }
                  
                  if (!phoneInput || phoneInput.trim() === '') {
                    toast.error(t("please-enter-a-valid-phone-number"));
                    return;
                  }

                  // Trigger OTP verification before saving
                  openOTPModal(
                    phoneInput,
                    async () => {
                      // On successful OTP verification, save the phone number
                      setIsSavingPhone(true);
                      try {
                        await apiRequest({
                          url: urls.update_user_profile,
                          method: 'POST',
                          isAuthRequest: true,
                          body: {
                            user_id: authResponse.localId,
                            phone: phoneInput,
                            username: profile.username,
                            email: profile.email,
                            show_price_on_purchase: profile.show_price_on_purchase,
                          },
                        });
                        setProfile(prev => ({ ...prev, phone: phoneInput }));
                        toast.success(t("phone-number-updated-successfully"));
                      } catch (error) {
                        console.error('Failed to update phone number:', error);
                        toast.error(t("failed-to-update-phone-number"));
                        // Revert on error
                        setPhoneInput(profile.phone || '');
                      } finally {
                        setIsSavingPhone(false);
                      }
                    },
                    () => {
                      // On cancel, revert phone input
                      setPhoneInput(profile.phone || '');
                    }
                  );
                }}
                disabled={isSavingPhone || phoneInput === (profile.phone || '')}
                className="sm:ms-2 px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isSavingPhone ?t("saving-2") :t("save")}
              </button>
            </div>
          </div>
          <div className="flex items-start mb-2.5">
            <label className="flex items-center mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={showPrice}
                onChange={async e => {
                  await setShowPrice(e.target.checked);
                  if (!authResponse || !('idToken' in authResponse)) {
                    setError(new Error(t("authentication-information-is-missing")));
                    setIsLoading(false);
                    navigate('/auth');
                    return;
                  }
                  await apiRequest({
                    url: urls.update_user_profile,
                    method: 'POST',
                    isAuthRequest: true,
                    body: {
                      user_id: authResponse.localId,
                      show_price_on_purchase: e.target.checked,
                      username: profile.username,
                      email: profile.email,
                      phone: profile.phone,
                    },
                  });
                }}
                className="me-2 h-4 w-4 border-gray-300 rounded focus:ring-green-600 text-green-700"
              />
              <span className="text-gray-700 font-medium">{t("show-price")}</span>
            </label>
          </div>
          {profile.maker && Object.keys(profile.maker).length > 0 && (
            <div className="mb-5">
              <h3 className="text-xl text-[#006400] mt-5 mb-2.5">{t("maker-information")}</h3>
              {Object.entries(profile.maker).map(([key, value]) => {
                const title = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                let icon = <FaDatabase />;
                if (key.includes("layer")) icon = <FaLayerGroup />;
                else if (key.includes("catalog")) icon = <FaBook />;
                else if (key.includes("report")) icon = <FaBook />;
                else if (key.includes("intelligence")) icon = <FaDatabase />;
                
                return renderSection(title, icon, value as Record<string, any>, key);
              })}
            </div>
          )}
        </div>
        {renderPopup()}
      </div>
    </div>
  );
};

export default ProfileMain;
