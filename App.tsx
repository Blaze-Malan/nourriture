import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';


import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// Saved dish data structure.
type MenuItem = {
  name: string;
  price: string;
  category: Category;
  description: string;
};

// Available dish categories.
type Category = 'Starter' | 'Main' | 'Desert' | 'Drink';

// Options shown in the dropdown menu.
const categories: Category[] = ['Starter', 'Main', 'Desert', 'Drink'];

export default function App() {
  // Screen and form state.
  const [isLoading, setIsLoading] = useState(true);
  const [isAddItemScreen, setIsAddItemScreen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState<Category | null>(null);
  const [itemDescription, setItemDescription] = useState('');
  const [savedItems, setSavedItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Loading screen.
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(loadingTimer);
  }, []);

  // Reset the form so the user can input new values every dish.
  const handleOpenAddItem = () => {
    setItemName('');
    setItemPrice('');
    setItemCategory(null);
    setItemDescription('');
    setErrorMessage('');
    setIsCategoryMenuOpen(false);
    setIsAddItemScreen(true);
  };

  // Show a confirmation toast similiar to kotlin.
  const showFeedbackMessage = (message: string) => {
    setFeedbackMessage(message);
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }
    feedbackTimer.current = setTimeout(() => {
      setFeedbackMessage('');
    }, 3000);
  };

  // Return to the menu without saving the form and give user a toast.
  const handleCancelItem = () => {
    showFeedbackMessage('Item canceled');
    setIsAddItemScreen(false);
  };

  // Clear active timers when the app is removed.
  useEffect(() => {
    return () => {
      if (errorTimer.current) {
        clearTimeout(errorTimer.current);
      }
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  // Validate and save a new dish.
  const handleSaveItem = () => {
    // Show an error when a required field is empty.
    if (!itemName.trim() || !itemCategory || !itemPrice.trim() || !itemDescription.trim()) {
      setErrorMessage('Please complete all required fields');
      if (errorTimer.current) {
        clearTimeout(errorTimer.current);
      }
      errorTimer.current = setTimeout(() => {
        setErrorMessage('');
      }, 3000);
      return;
    }

    // Add the new dish to the menu.
    setSavedItems((currentItems) => [...currentItems, {
      name: itemName.trim(),
      price: itemPrice.trim(),
      category: itemCategory,
      description: itemDescription.trim(),
    }]);
    setErrorMessage('');
    showFeedbackMessage('Item added');
    setIsAddItemScreen(false);
  };

  // Display the startup loading screen.
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.logo}>nourriture</Text>
        <ActivityIndicator color="#ffffff" size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  // Display screen 2 for adding a dish.
  if (isAddItemScreen) {
    return (
      <View style={styles.screenContainer}>
        <View style={styles.screenHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={handleCancelItem}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressedButton]}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.screenTitle}>Add new dish</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.formScroll}
        >
          {/* Item name field. */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Item name</Text>
            <TextInput
              onChangeText={setItemName}
              placeholder="Enter item name"
              placeholderTextColor="#89938e"
              style={styles.textInput}
              value={itemName}
            />
          </View>
          {/* Category dropdown field. */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Category</Text>
            <Pressable
              onPress={() => setIsCategoryMenuOpen((isOpen) => !isOpen)}
              style={styles.dropdownButton}
            >
              <Text style={itemCategory ? styles.dropdownText : styles.dropdownPlaceholder}>
                {itemCategory ?? 'Select category'}
              </Text>
              <Text style={styles.dropdownChevron}>{isCategoryMenuOpen ? '^' : 'v'}</Text>
            </Pressable>
            {isCategoryMenuOpen ? (
              <View style={styles.dropdownOptions}>
                {categories.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => {
                      setItemCategory(category);
                      setIsCategoryMenuOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.dropdownOption,
                      pressed && styles.dropdownOptionPressed,
                    ]}
                  >
                    <Text style={styles.dropdownOptionText}>{category}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          {/* Price field. */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Price</Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(value) => {
                if (/^\d*\.?\d*$/.test(value)) {
                  setItemPrice(value);
                }
              }}
              placeholder="Enter price"
              placeholderTextColor="#89938e"
              style={styles.textInput}
              value={itemPrice}
            />
          </View>
          {/* Description field. */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              multiline
              onChangeText={setItemDescription}
              placeholder="Enter description"
              placeholderTextColor="#89938e"
              style={[styles.textInput, styles.descriptionInput]}
              textAlignVertical="top"
              value={itemDescription}
            />
          </View>
        </ScrollView>
        {/* Required-field error message. */}
        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        {/* Save the new dish. */}
        <Pressable
          onPress={handleSaveItem}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressedButton]}
        >
          <Text style={styles.addButtonText}>Save</Text>
        </Pressable>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Display screen 3 with read-only dish details.
  if (selectedItem) {
    return (
      <View style={styles.screenContainer}>
        <View style={styles.screenHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSelectedItem(null)}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressedButton]}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.screenTitle}>Dish details</Text>
          <View style={styles.headerSpacer} />
        </View>
        {/* Dish information. */}
        <ScrollView contentContainerStyle={styles.detailsContent}>
          <View style={styles.detailGroup}>
            <Text style={styles.detailLabel}>Item name</Text>
            <Text style={styles.detailValue}>{selectedItem.name}</Text>
          </View>
          <View style={styles.detailGroup}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{selectedItem.category}</Text>
          </View>
          <View style={styles.detailGroup}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>R{selectedItem.price}</Text>
          </View>
          <View style={styles.detailGroup}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailValue}>{selectedItem.description}</Text>
          </View>
        </ScrollView>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Display the main menu screen.
  return (
    <View style={styles.mainContainer}>
      {/* Confirmation toast. */}
      {feedbackMessage ? (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>{feedbackMessage}</Text>
        </View>
      ) : null}
      <Text style={styles.screenTitle}>Menu</Text>
      {/* Clickable saved dishes. */}
      <ScrollView
        contentContainerStyle={styles.menuContent}
        showsVerticalScrollIndicator={false}
        style={styles.menuScroll}
      >
        {savedItems.map((item, index) => (
          <Pressable
            key={`${item.name}-${index}`}
            onPress={() => setSelectedItem(item)}
            style={({ pressed }) => [styles.itemCard, pressed && styles.pressedCard]}
          >
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>R{item.price}</Text>
            <Text style={styles.itemDescription}>{item.category}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {/* Open screen 2 for a new dish. */}
      <Pressable
        onPress={handleOpenAddItem}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressedButton]}
      >
        <Text style={styles.addButtonText}>Add new item</Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: '#1f6f5b',
  },
  logo: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 1,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#f7f4ed',
    padding: 24,
    paddingTop: 72,
    paddingBottom: 40,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#f7f4ed',
    padding: 24,
    paddingTop: 72,
    paddingBottom: 40,
  },
  screenTitle: {
    color: '#1f6f5b',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  screenHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#b3261e',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: 10,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSpacer: {
    minWidth: 64,
  },
  formContent: {
    gap: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  formScroll: {
    flex: 1,
  },
  dropdownButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#c8d2cd',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  dropdownText: {
    color: '#26332e',
    fontSize: 16,
  },
  dropdownPlaceholder: {
    color: '#89938e',
    fontSize: 16,
  },
  dropdownChevron: {
    color: '#1f6f5b',
    fontSize: 18,
    fontWeight: '700',
  },
  dropdownOptions: {
    backgroundColor: '#ffffff',
    borderColor: '#c8d2cd',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownOption: {
    borderBottomColor: '#e4e9e6',
    borderBottomWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dropdownOptionPressed: {
    backgroundColor: '#eef4f1',
  },
  dropdownOptionText: {
    color: '#26332e',
    fontSize: 16,
  },
  menuScroll: {
    flex: 1,
    marginVertical: 24,
  },
  menuContent: {
    gap: 16,
    paddingBottom: 8,
  },
  detailsContent: {
    gap: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  detailGroup: {
    gap: 8,
  },
  detailLabel: {
    color: '#1f6f5b',
    fontSize: 16,
    fontWeight: '600',
  },
  detailValue: {
    color: '#26332e',
    fontSize: 18,
    lineHeight: 26,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: '#1f6f5b',
    fontSize: 16,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderColor: '#c8d2cd',
    borderRadius: 8,
    borderWidth: 1,
    color: '#26332e',
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  descriptionInput: {
    minHeight: 140,
  },
  errorMessage: {
    color: '#b3261e',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  toast: {
    alignSelf: 'center',
    backgroundColor: '#26332e',
    borderRadius: 24,
    elevation: 6,
    left: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    position: 'absolute',
    right: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    top: 24,
    zIndex: 10,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderColor: '#c8d2cd',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 20,
    width: '100%',
  },
  pressedCard: {
    opacity: 0.75,
  },
  itemName: {
    color: '#1f6f5b',
    fontSize: 20,
    fontWeight: '700',
  },
  itemPrice: {
    color: '#26332e',
    fontSize: 16,
    fontWeight: '600',
  },
  itemDescription: {
    color: '#4f5d57',
    fontSize: 15,
    lineHeight: 22,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#1f6f5b',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 24,
    width: '100%',
  },
  pressedButton: {
    opacity: 0.8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
