import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

export interface SimpleDate {
  year: number;
  month: number; // 0-11
  day: number; // 1-31
}

type Field = 'month' | 'day' | 'year';
type Side = 'start' | 'end';

interface DateRangeSelectorProps {
  start: SimpleDate;
  end: SimpleDate;
  onChange: (start: SimpleDate, end: SimpleDate) => void;
  isDarkMode: boolean;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const FIRST_YEAR = 2005;

export const daysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

const compareDates = (a: SimpleDate, b: SimpleDate): number =>
  a.year - b.year || a.month - b.month || a.day - b.day;

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  start,
  end,
  onChange,
  isDarkMode,
}) => {
  const [openField, setOpenField] = React.useState<{
    side: Side;
    field: Field;
  } | null>(null);

  const currentYear = new Date().getFullYear();
  const years = React.useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= FIRST_YEAR; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const updateDate = (side: Side, field: Field, value: number) => {
    const current = side === 'start' ? start : end;
    const next: SimpleDate = {...current, [field]: value};
    // Clamp the day so e.g. Mar 31 -> Feb becomes Feb 28/29
    next.day = Math.min(next.day, daysInMonth(next.year, next.month));

    let newStart = side === 'start' ? next : start;
    let newEnd = side === 'end' ? next : end;

    // Keep the range valid by pulling the other end along
    if (compareDates(newStart, newEnd) > 0) {
      if (side === 'start') {
        newEnd = newStart;
      } else {
        newStart = newEnd;
      }
    }

    onChange(newStart, newEnd);
    setOpenField(null);
  };

  const toggleField = (side: Side, field: Field) => {
    const isOpen = openField?.side === side && openField?.field === field;
    setOpenField(isOpen ? null : {side, field});
  };

  const renderFieldButton = (side: Side, field: Field, label: string) => {
    const isOpen = openField?.side === side && openField?.field === field;
    return (
      <TouchableOpacity
        style={[
          styles.fieldButton,
          field === 'year' && styles.fieldButtonWide,
          isDarkMode && styles.fieldButtonDark,
          isOpen && styles.fieldButtonOpen,
        ]}
        onPress={() => toggleField(side, field)}>
        <Text
          style={[
            styles.fieldText,
            (isDarkMode || isOpen) && styles.fieldTextLight,
          ]}>
          {label} ▾
        </Text>
      </TouchableOpacity>
    );
  };

  const renderOptions = () => {
    if (!openField) {
      return null;
    }

    const date = openField.side === 'start' ? start : end;
    let options: {value: number; label: string}[];
    let selected: number;

    switch (openField.field) {
      case 'month':
        options = MONTHS.map((label, value) => ({value, label}));
        selected = date.month;
        break;
      case 'day':
        options = Array.from(
          {length: daysInMonth(date.year, date.month)},
          (_, i) => ({
            value: i + 1,
            label: String(i + 1),
          }),
        );
        selected = date.day;
        break;
      case 'year':
        options = years.map(y => ({value: y, label: String(y)}));
        selected = date.year;
        break;
    }

    const cellStyle =
      openField.field === 'day'
        ? styles.optionDay
        : openField.field === 'month'
        ? styles.optionMonth
        : styles.optionYear;

    return (
      <View style={[styles.optionsGrid, isDarkMode && styles.optionsGridDark]}>
        {options.map(option => {
          const isSelected = option.value === selected;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                cellStyle,
                isDarkMode && styles.optionDark,
                isSelected && styles.optionSelected,
              ]}
              onPress={() =>
                updateDate(openField.side, openField.field, option.value)
              }>
              <Text
                style={[
                  styles.optionText,
                  (isDarkMode || isSelected) && styles.fieldTextLight,
                ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderRow = (side: Side, label: string) => {
    const date = side === 'start' ? start : end;
    return (
      <View style={styles.row}>
        <Text style={[styles.rowLabel, isDarkMode && styles.rowLabelDark]}>
          {label}
        </Text>
        {renderFieldButton(side, 'month', MONTHS[date.month])}
        {renderFieldButton(side, 'day', String(date.day))}
        {renderFieldButton(side, 'year', String(date.year))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderRow('start', 'From')}
      {openField?.side === 'start' && renderOptions()}
      {renderRow('end', 'To')}
      {openField?.side === 'end' && renderOptions()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLabel: {
    width: 40,
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  rowLabelDark: {
    color: '#aaa',
  },
  fieldButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    minWidth: 56,
    alignItems: 'center',
  },
  fieldButtonWide: {
    minWidth: 70,
  },
  fieldButtonDark: {
    backgroundColor: '#1c1c1e',
  },
  fieldButtonOpen: {
    backgroundColor: '#007bff',
  },
  fieldText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  fieldTextLight: {
    color: '#fff',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 6,
    marginLeft: 46,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  optionsGridDark: {
    backgroundColor: '#1c1c1e',
  },
  option: {
    paddingVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 4,
    alignItems: 'center',
  },
  optionDay: {
    width: 30,
  },
  optionMonth: {
    width: 44,
  },
  optionYear: {
    width: 50,
  },
  optionDark: {
    backgroundColor: '#2c2c2e',
  },
  optionSelected: {
    backgroundColor: '#007bff',
  },
  optionText: {
    fontSize: 12,
    color: '#333',
  },
});
