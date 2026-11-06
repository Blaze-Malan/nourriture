import AsyncStorage from '@react-native-async-storage/async-storage';
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
type Category = 'Starter' | 'Main' | 'Dessert' | 'Drink';

// Options shown in the dropdown menu.
const categories: Category[] = ['Starter', 'Main', 'Dessert', 'Drink'];
const menuStorageKey = '@nourriture/menu';

function isMenuItem(value: unknown): value is MenuItem {
  if (
    typeof value !== 'object' || value === null ||
    !('name' in value) || !('price' in value) ||
    !('category' in value) || !('description' in value)
  ) {
    return false;
  }

  return typeof value.name === 'string' &&
    typeof value.price === 'string' &&
    value.price.trim() !== '' &&
    Number.isFinite(Number(value.price)) &&
    categories.some((category) => category === value.category) &&
    typeof value.description === 'string';
}

export default function App() {
  // Screen and form state.
  const [isLoading, setIsLoading] = useState(true);
  const [storageStatus, setStorageStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddItemScreen, setIsAddItemScreen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState<Category | null>(null);
  const [itemDescription, setItemDescription] = useState('');
  const [savedItems, setSavedItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<Category | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const savingRef = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedItem = selectedItemIndex === null ? null : savedItems[selectedItemIndex] ?? null;
  const filteredItems = savedItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) =>
      item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
      (selectedCategoryFilter === null || item.category === selectedCategoryFilter)
    );
  const averagePrice = savedItems.length > 0
    ? savedItems.reduce((total, item) => total + Number(item.price), 0) / savedItems.length
    : null;
  const courseCounts = categories.reduce<Record<Category, number>>((counts, category) => {
    counts[category] = savedItems.filter((item) => item.category === category).length;
    return counts;
  }, { Starter: 0, Main: 0, Dessert: 0, Drink: 0 });
  const feedbackToast = feedbackMessage ? (
    <View pointerEvents="none" style={styles.toast}>
      <Text accessibilityLiveRegion="polite" style={styles.toastText}>{feedbackMessage}</Text>
    </View>
  ) : null;

  // Loading screen.
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(loadingTimer);
  }, []);

  useEffect(() => {
    let active = true;

    const loadMenu = async () => {
      try {
        const storedMenu = await AsyncStorage.getItem(menuStorageKey);
        const parsedMenu: unknown = storedMenu === null ? [] : JSON.parse(storedMenu);
        if (!Array.isArray(parsedMenu) || !parsedMenu.every(isMenuItem)) {
          throw new Error('Stored menu data is invalid.');
        }
        if (active) {
          setSavedItems(parsedMenu);
          setStorageStatus('ready');
        }
      } catch (error) {
        console.error('Unable to load the saved menu:', error);
        if (active) {
          setStorageStatus('error');
        }
      }
    };

    loadMenu();
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const saveMenu = async (items: MenuItem[]) => {
    if (savingRef.current) {
      return false;
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(menuStorageKey, JSON.stringify(items));
      setSavedItems(items);
      return true;
    } catch (error) {
      console.error('Unable to save the menu:', error);
      setErrorMessage('Could not save your menu. Please try again.');
      return false;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  // Reset the form so the user can input new values every dish.
  const handleOpenAddItem = () => {
    setItemName('');
    setItemPrice('');
    setItemCategory(null);
    setItemDescription('');
    setErrorMessage('');
    setIsCategoryMenuOpen(false);
    setSelectedItemIndex(null);
    setIsAddItemScreen(true);
  };

  const handleOpenEditItem = () => {
    if (!selectedItem) {
      return;
    }

    setItemName(selectedItem.name);
    setItemPrice(selectedItem.price);
    setItemCategory(selectedItem.category);
    setItemDescription(selectedItem.description);
    setErrorMessage('');
    setIsCategoryMenuOpen(false);
    setIsAddItemScreen(true);
  };

  // Show a confirmation toast.
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
    showFeedbackMessage(selectedItemIndex === null ? 'Item canceled' : 'Changes canceled');
    setIsAddItemScreen(false);
  };

  // Clear active timers when the app is removed.
  useEffect(() => {
    return () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  // Validate and save a new dish or update an existing one.
  const handleSaveItem = async () => {
    if (savingRef.current) {
      return;
    }
    if (!itemName.trim()) {
      setErrorMessage('Enter an item name.');
      return;
    }

    if (!itemCategory) {
      setErrorMessage('Choose a course.');
      return;
    }

    if (!itemPrice.trim() || !Number.isFinite(Number(itemPrice))) {
      setErrorMessage('Enter a valid price.');
      return;
    }

    if (!itemDescription.trim()) {
      setErrorMessage('Enter an item description.');
      return;
    }

    const updatedItem: MenuItem = {
      name: itemName.trim(),
      price: itemPrice.trim(),
      category: itemCategory,
      description: itemDescription.trim(),
    };

    const updatedMenu = selectedItemIndex === null
      ? [...savedItems, updatedItem]
      : savedItems.map((item, index) => index === selectedItemIndex ? updatedItem : item);
    if (await saveMenu(updatedMenu)) {
      showFeedbackMessage(selectedItemIndex === null ? 'Item added' : 'Item updated');
      setErrorMessage('');
      setIsAddItemScreen(false);
    }
  };

  const handleDeleteItem = async () => {
    if (selectedItemIndex === null || savingRef.current) {
      return;
    }

    const updatedMenu = savedItems.filter((_, index) => index !== selectedItemIndex);
    if (await saveMenu(updatedMenu)) {
      setSelectedItemIndex(null);
      setIsDeleteConfirmationVisible(false);
      setErrorMessage('');
      showFeedbackMessage('Item deleted');
    }
  };

  // Display the startup loading screen.
  if (isLoading || storageStatus === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.logo}>nourriture</Text>
        <ActivityIndicator color="#ffffff" size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  if (storageStatus === 'error') {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.screenTitle}>Unable to load menu</Text>
        <Text style={styles.storageErrorText}>
          Your saved menu could not be loaded. Please try again. No changes have been made to it.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setStorageStatus('loading');
            setLoadAttempt((attempt) => attempt + 1);
          }}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressedButton]}
        >
          <Text style={styles.addButtonText}>Try again</Text>
        </Pressable>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Display the form for adding or editing a dish.
  if (isAddItemScreen) {
    return (
      <View pointerEvents={isSaving ? 'none' : 'auto'} style={styles.screenContainer}>
        <View style={styles.screenHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={handleCancelItem}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressedButton]}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.screenTitle}>
            {selectedItemIndex === null ? 'Add new dish' : 'Edit dish'}
          </Text>
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
              accessibilityLabel="Item name"
              autoCapitalize="words"
              onChangeText={(value) => {
                setItemName(value);
                if (value.trim() && errorMessage === 'Enter an item name.') {
                  setErrorMessage('');
                }
              }}
              placeholder="Enter item name"
              placeholderTextColor="#89938e"
              style={styles.textInput}
              value={itemName}
            />
          </View>
          {/* Category dropdown field. */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Course</Text>
            <Pressable
              accessibilityLabel={`Course: ${itemCategory ?? 'Select a course'}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: isCategoryMenuOpen }}
              onPress={() => setIsCategoryMenuOpen((isOpen) => !isOpen)}
              style={styles.dropdownButton}
            >
              <Text style={itemCategory ? styles.dropdownText : styles.dropdownPlaceholder}>
                {itemCategory ?? 'Select course'}
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
                      if (errorMessage === 'Choose a course.') {
                        setErrorMessage('');
                      }
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
              accessibilityLabel="Price"
              keyboardType="decimal-pad"
              onChangeText={(value) => {
                if (/^\d*\.?\d*$/.test(value)) {
                  setItemPrice(value);
                  if (
                    value.trim() &&
                    Number.isFinite(Number(value)) &&
                    errorMessage === 'Enter a valid price.'
                  ) {
                    setErrorMessage('');
                  }
                }
              }}
              placeholder="Enter price (e.g. 12.50)"
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
              accessibilityLabel="Description"
              onChangeText={(value) => {
                setItemDescription(value);
                if (value.trim() && errorMessage === 'Enter an item description.') {
                  setErrorMessage('');
                }
              }}
              placeholder="Enter description"
              placeholderTextColor="#89938e"
              style={[styles.textInput, styles.descriptionInput]}
              textAlignVertical="top"
              value={itemDescription}
            />
          </View>
        </ScrollView>
        {/* Required-field error message. */}
        {errorMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.errorMessage}>{errorMessage}</Text>
        ) : null}
        {/* Save the new dish or update the selected one. */}
        <Pressable
          disabled={isSaving}
          onPress={handleSaveItem}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressedButton]}
        >
          <Text style={styles.addButtonText}>
            {isSaving ? 'Saving...' : selectedItemIndex === null ? 'Save' : 'Update'}
          </Text>
        </Pressable>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Display dish details and available menu actions.
  if (selectedItem) {
    return (
      <View pointerEvents={isSaving ? 'none' : 'auto'} style={styles.screenContainer}>
        {feedbackToast}
        <View style={styles.screenHeader}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setSelectedItemIndex(null);
              setIsDeleteConfirmationVisible(false);
            }}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressedButton]}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.screenTitle}>Dish details</Text>
          <View style={styles.headerSpacer} />
        </View>
        {/* Dish information. */}
        <ScrollView contentContainerStyle={styles.detailsContent} style={styles.formScroll}>
          <View style={styles.detailGroup}>
            <Text style={styles.detailLabel}>Item name</Text>
            <Text style={styles.detailValue}>{selectedItem.name}</Text>
          </View>
          <View style={styles.detailGroup}>
            <Text style={styles.detailLabel}>Course</Text>
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
        {isDeleteConfirmationVisible ? (
          <View style={styles.deleteConfirmation}>
            <Text style={styles.deleteConfirmationText}>
              Delete this item from your menu?
            </Text>
            {errorMessage ? (
              <Text accessibilityLiveRegion="polite" style={styles.errorMessage}>{errorMessage}</Text>
            ) : null}
            <View style={styles.actionButtons}>
              <Pressable
                onPress={() => {
                  setIsDeleteConfirmationVisible(false);
                  setErrorMessage('');
                }}
                style={({ pressed }) => [
                  styles.secondaryActionButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={styles.secondaryActionButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={isSaving}
                onPress={handleDeleteItem}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={styles.addButtonText}>{isSaving ? 'Deleting...' : 'Delete'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <Pressable
              onPress={handleOpenEditItem}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressedButton]}
            >
              <Text style={styles.addButtonText}>Edit item</Text>
            </Pressable>
            <Pressable
              onPress={() => setIsDeleteConfirmationVisible(true)}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressedButton]}
            >
              <Text style={styles.addButtonText}>Delete item</Text>
            </Pressable>
          </View>
        )}
        <StatusBar style="auto" />
      </View>
    );
  }

  // Display the main menu screen.
  return (
    <View style={styles.mainContainer}>
      {feedbackToast}
      <ScrollView
        contentContainerStyle={styles.mainScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.mainScroll}
      >
        <Text style={styles.screenTitle}>Menu</Text>
        <View style={styles.overview}>
          <Text style={styles.overviewTitle}>Menu overview</Text>
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total items</Text>
              <Text style={styles.summaryValue}>{savedItems.length}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Average price</Text>
              <Text style={styles.summaryValue}>
                {averagePrice === null ? '—' : `R${averagePrice.toFixed(2)}`}
              </Text>
            </View>
          </View>
          <Text style={styles.courseCountsTitle}>Items by course</Text>
          <View style={styles.courseCountCards}>
            {categories.map((category) => (
              <View key={category} style={styles.courseCountCard}>
                <Text style={styles.courseCountLabel}>{category}</Text>
                <Text style={styles.courseCountValue}>{courseCounts[category]}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.menuFilters}>
          <View style={styles.searchInputContainer}>
            <TextInput
              accessibilityLabel="Search menu items by name"
              onChangeText={setSearchQuery}
              placeholder="Search menu by name"
              placeholderTextColor="#89938e"
              returnKeyType="search"
              style={styles.searchInput}
              value={searchQuery}
            />
            {searchQuery ? (
              <Pressable
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                onPress={() => setSearchQuery('')}
                style={({ pressed }) => [styles.clearSearchButton, pressed && styles.pressedButton]}
              >
                <Text style={styles.clearSearchText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.filterRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isFilterMenuOpen }}
              onPress={() => setIsFilterMenuOpen((isOpen) => !isOpen)}
              style={styles.filterButton}
            >
              <Text style={styles.filterButtonText}>
                Course: {selectedCategoryFilter ?? 'All courses'}
              </Text>
              <Text style={styles.dropdownChevron}>{isFilterMenuOpen ? '^' : 'v'}</Text>
            </Pressable>
            {searchQuery || selectedCategoryFilter ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategoryFilter(null);
                  setIsFilterMenuOpen(false);
                }}
                style={({ pressed }) => [styles.clearFiltersButton, pressed && styles.pressedButton]}
              >
                <Text style={styles.clearFiltersText}>Clear all</Text>
              </Pressable>
            ) : null}
          </View>
          {isFilterMenuOpen ? (
            <View style={styles.filterOptions}>
              {[null, ...categories].map((category) => (
                <Pressable
                  key={category ?? 'all'}
                  onPress={() => {
                    setSelectedCategoryFilter(category);
                    setIsFilterMenuOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    pressed && styles.dropdownOptionPressed,
                  ]}
                >
                  <Text style={styles.dropdownOptionText}>{category ?? 'All courses'}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
        {/* Matching menu items. */}
        <View style={styles.menuContent}>
          {filteredItems.length === 0 ? (
            <Text style={styles.emptyMenuMessage}>
              {savedItems.length === 0
                ? 'No menu items yet. Add your first item.'
                : 'No menu items match your search or course filter.'}
            </Text>
          ) : null}
          {filteredItems.map(({ item, index }) => (
            <Pressable
              key={`${item.name}-${index}`}
              onPress={() => {
                setFeedbackMessage('');
                setSelectedItemIndex(index);
                setIsDeleteConfirmationVisible(false);
              }}
              style={({ pressed }) => [styles.itemCard, pressed && styles.pressedCard]}
            >
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>R{item.price}</Text>
              <Text style={styles.itemDescription}>{item.category}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={styles.addButtonFooter}>
        <Pressable
          onPress={handleOpenAddItem}
          style={({ pressed }) => [styles.addButton, pressed && styles.pressedButton]}
        >
          <Text style={styles.addButtonText}>Add new item</Text>
        </Pressable>
      </View>
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
  overview: {
    backgroundColor: '#eef4f1',
    borderColor: '#c8d2cd',
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginTop: 16,
    padding: 14,
  },
  overviewTitle: {
    color: '#1f6f5b',
    fontSize: 18,
    fontWeight: '700',
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flex: 1,
    gap: 4,
    padding: 12,
  },
  summaryLabel: {
    color: '#4f5d57',
    fontSize: 13,
  },
  summaryValue: {
    color: '#26332e',
    fontSize: 20,
    fontWeight: '700',
  },
  courseCountsTitle: {
    color: '#26332e',
    fontSize: 14,
    fontWeight: '600',
  },
  courseCountCards: {
    flexDirection: 'row',
    gap: 8,
  },
  courseCountCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flex: 1,
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  courseCountLabel: {
    color: '#4f5d57',
    fontSize: 11,
  },
  courseCountValue: {
    color: '#1f6f5b',
    fontSize: 18,
    fontWeight: '700',
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
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 8,
  },
  addButtonFooter: {
    paddingTop: 16,
  },
  menuContent: {
    gap: 16,
    paddingBottom: 8,
    marginTop: 16,
  },
  menuFilters: {
    gap: 12,
    marginTop: 24,
  },
  searchInputContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#c8d2cd',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  searchInput: {
    color: '#26332e',
    flex: 1,
    fontSize: 16,
    minHeight: 50,
    paddingVertical: 12,
  },
  clearSearchButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  clearSearchText: {
    color: '#1f6f5b',
    fontSize: 14,
    fontWeight: '600',
  },
  filterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#c8d2cd',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  filterButtonText: {
    color: '#26332e',
    fontSize: 15,
  },
  clearFiltersButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  clearFiltersText: {
    color: '#1f6f5b',
    fontSize: 14,
    fontWeight: '600',
  },
  filterOptions: {
    backgroundColor: '#ffffff',
    borderColor: '#c8d2cd',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyMenuMessage: {
    color: '#4f5d57',
    fontSize: 16,
    paddingVertical: 24,
    textAlign: 'center',
  },
  detailsContent: {
    gap: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  deleteConfirmation: {
    gap: 16,
    paddingTop: 16,
  },
  deleteConfirmationText: {
    color: '#26332e',
    fontSize: 16,
    textAlign: 'center',
  },
  actionButtons: {
    gap: 12,
  },
  secondaryActionButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#c8d2cd',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 24,
    width: '100%',
  },
  secondaryActionButtonText: {
    color: '#26332e',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#b3261e',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 24,
    width: '100%',
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
  storageErrorText: {
    color: '#26332e',
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 24,
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
