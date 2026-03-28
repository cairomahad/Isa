import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRef, forwardRef, useImperativeHandle } from 'react';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Colors } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

interface MenuBottomSheetProps {
  items: MenuItem[];
}

export interface MenuBottomSheetRef {
  open: () => void;
  close: () => void;
}

export const MenuBottomSheet = forwardRef<MenuBottomSheetRef, MenuBottomSheetProps>(
  ({ items }, ref) => {
    const bottomSheetRef = useRef<BottomSheet>(null);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.expand(),
      close: () => bottomSheetRef.current?.close(),
    }));

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={[300]}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.indicator}
      >
        <BottomSheetView style={styles.contentContainer}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => {
                item.onPress();
                bottomSheetRef.current?.close();
              }}
            >
              <Ionicons
                name={item.icon as any}
                size={24}
                color={item.color || Colors.textPrimary}
              />
              <Text style={[styles.menuLabel, item.color && { color: item.color }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  indicator: {
    backgroundColor: Colors.border,
    width: 40,
  },
  contentContainer: {
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 16,
  },
});
