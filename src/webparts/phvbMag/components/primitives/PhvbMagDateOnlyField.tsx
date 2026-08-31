import * as React from 'react';
import { createTheme, DatePicker, type IDatePickerStrings, type ITextFieldStyles, type Theme } from '@fluentui/react';
import { formatDateForInput, parseInputDate } from '../../utils/PhvbMagSla.utils';
import { formatDateOnlyVi } from '../../utils/PhvbMagDateTime.utils';

const VI_DATE_PICKER_STRINGS: IDatePickerStrings = {
  months: [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ],
  shortMonths: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
  days: ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'],
  shortDays: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  goToToday: 'Hôm nay',
  prevMonthAriaLabel: 'Tháng trước',
  nextMonthAriaLabel: 'Tháng sau',
  prevYearAriaLabel: 'Năm trước',
  nextYearAriaLabel: 'Năm sau',
  closeButtonAriaLabel: 'Đóng',
  weekNumberFormatString: 'Tuần {0}'
};

// Bronze/cream PHVB palette recolors the whole DatePicker (text field focus, calendar
// selected/today highlight, "Hôm nay" link) instead of Fluent's default blue theme —
// see components/_PhvbMag.colors.scss for the source hex values ($primary-color etc.).
const PHVB_DATE_PICKER_THEME: Theme = createTheme({
  palette: {
    themePrimary: '#7B4C2C',
    themeDarkAlt: '#6B4227',
    themeDark: '#5C3D2E',
    themeDarker: '#452D22',
    themeSecondary: '#8B5A39',
    themeTertiary: '#B08558',
    themeLight: '#F5EBE0',
    themeLighter: '#F5EBE0',
    themeLighterAlt: '#FCF9F5',
    neutralPrimary: '#1C1510',
    neutralSecondary: '#8C827A',
    neutralLight: '#E8E2D9',
    neutralLighter: '#FAF6F0'
  }
});

export type PhvbMagDateOnlyFieldSize = 'default' | 'compact';

const DATE_PICKER_INVALID_COLOR = '#D32F2F';
const DATE_PICKER_DISABLED_BG = '#F8F5EF';
const DATE_PICKER_RADIUS = '4px';

const SIZE_TOKENS: Record<PhvbMagDateOnlyFieldSize, { borderColor: string; padding: string; fontSize: string }> = {
  default: { borderColor: '#E8E2D9', padding: '8px 11px', fontSize: '13.5px' },
  compact: { borderColor: '#E5D6C7', padding: '4px 8px', fontSize: '12px' }
};

function parseViDateText(value: string): Date | undefined {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return undefined;
  }

  return parsed;
}

function buildTextFieldStyles(isInvalid: boolean, size: PhvbMagDateOnlyFieldSize): Partial<ITextFieldStyles> {
  const sizeTokens = SIZE_TOKENS[size];
  const borderWidth = size === 'compact' ? '1px' : '1.5px';
  const borderColor = isInvalid ? DATE_PICKER_INVALID_COLOR : sizeTokens.borderColor;

  return {
    fieldGroup: {
      border: `${borderWidth} solid ${borderColor}`,
      borderRadius: DATE_PICKER_RADIUS,
      backgroundColor: '#FFFFFF',
      height: 'auto',
      selectors: {
        ':hover': {
          border: `${borderWidth} solid ${borderColor}`
        },
        '&.is-disabled': {
          backgroundColor: DATE_PICKER_DISABLED_BG
        }
      }
    },
    field: {
      padding: sizeTokens.padding,
      fontSize: sizeTokens.fontSize,
      selectors: {
        '::placeholder': {
          color: '#8C827A'
        }
      }
    },
    icon: {
      color: '#7B4C2C',
      right: 8
    }
  };
}

export interface IPhvbMagDateOnlyFieldProps {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  disabled?: boolean;
  isInvalid?: boolean;
  size?: PhvbMagDateOnlyFieldSize;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
}

export function PhvbMagDateOnlyField(props: IPhvbMagDateOnlyFieldProps): React.ReactElement {
  const {
    id,
    value,
    onChange,
    onBlur,
    minDate,
    maxDate,
    placeholder,
    disabled,
    isInvalid = false,
    size = 'default',
    ariaLabel,
    ariaDescribedBy,
    className
  } = props;

  const selectedDate = parseInputDate(value);

  return (
    <div className={className}>
      <DatePicker
        theme={PHVB_DATE_PICKER_THEME}
        textField={{
          id,
          ariaLabel,
          'aria-describedby': ariaDescribedBy,
          onBlur,
          styles: buildTextFieldStyles(isInvalid, size)
        }}
        value={selectedDate}
        onSelectDate={date => onChange(date ? formatDateForInput(date) : '')}
        formatDate={date => (date ? formatDateOnlyVi(formatDateForInput(date)) : '')}
        parseDateFromString={text => parseViDateText(text) || selectedDate || new Date()}
        allowTextInput
        placeholder={placeholder || 'dd/mm/yyyy'}
        minDate={parseInputDate(minDate)}
        maxDate={parseInputDate(maxDate)}
        disabled={disabled}
        strings={VI_DATE_PICKER_STRINGS}
        styles={{ root: {} }}
      />
    </div>
  );
}
