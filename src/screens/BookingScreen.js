import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { bookingService, authService } from '../services/api';
import ConfirmationModal from '../components/ConfirmationModal';

const BookingScreen = ({ onLogout }) => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const timeSlots = [
    '08:00 - 09:00',
    '09:00 - 10:00',
    '10:00 - 11:00',
    '11:00 - 12:00',
    '12:00 - 13:00',
    '13:00 - 14:00',
    '14:00 - 15:00',
    '15:00 - 16:00',
    '16:00 - 17:00',
    '17:00 - 18:00',
  ];

  useEffect(() => {
    loadUser();
    updateSelectedDate();
  }, []);

  useEffect(() => {
    updateSelectedDate();
  }, [selectedMonth, selectedDay, selectedYear]);

  useEffect(() => {
    if (selectedDate) {
      fetchBookedSlots(selectedDate);
    }
  }, [selectedDate]);

  const loadUser = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  const updateSelectedDate = () => {
    const date = new Date(selectedYear, selectedMonth, selectedDay);
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(dateString);
    setSelectedSlots([]);
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getYears = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear + 1];
  };

  const fetchBookedSlots = async (date) => {
    setLoading(true);
    try {
      const bookings = await bookingService.getBookings(date);
      const slots = bookings.map(booking => booking.time_slot);
      setBookedSlots(slots);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleSlotSelect = (slot) => {
    console.log('Slot selected:', slot);
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
    } else {
      if (selectedSlots.length >= 2) {
        Alert.alert('Limit Reached', 'You can only book a maximum of 2 slots.');
        return;
      }
      setSelectedSlots([...selectedSlots, slot]);
    }
    console.log('Selected slots:', selectedSlots);
  };

  const handleBooking = async () => {
    console.log('Book button clicked!');
    console.log('Selected date:', selectedDate);
    console.log('Selected slots:', selectedSlots);

    if (!selectedDate) {
      Alert.alert('No Date Selected', 'Please select a date first.');
      return;
    }
    if (selectedSlots.length === 0) {
      Alert.alert('No Slots Selected', 'Please select at least one time slot.');
      return;
    }

    const formattedDate = `${months[selectedMonth]} ${selectedDay}, ${selectedYear}`;
    const confirmMessage = `Date: ${formattedDate}\n\nTime Slots:\n${selectedSlots.map(slot => `• ${slot}`).join('\n')}`;

    console.log('Showing confirmation dialog');
    setConfirmationMessage(confirmMessage);
    setShowConfirmModal(true);
  };

  const handleConfirmBooking = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      const response = await bookingService.createBooking(selectedDate, selectedSlots);
      Alert.alert('Success', response.message || 'Booking confirmed!');
      setSelectedSlots([]);
      fetchBookedSlots(selectedDate);
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Booking failed';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = () => {
    setShowConfirmModal(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            onLogout();
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Laundry Booking</Text>
          {user && <Text style={styles.welcomeText}>Welcome, {user.username}!</Text>}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.datePickerContainer}>
        <Text style={styles.sectionTitle}>Select a Date</Text>
        <View style={styles.dropdownRow}>
          <View style={styles.dropdownWrapper}>
            <Text style={styles.dropdownLabel}>Month</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(value) => setSelectedMonth(value)}
                style={styles.picker}
              >
                {months.map((month, index) => (
                  <Picker.Item key={index} label={month} value={index} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.dropdownWrapper}>
            <Text style={styles.dropdownLabel}>Day</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedDay}
                onValueChange={(value) => setSelectedDay(value)}
                style={styles.picker}
              >
                {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1).map((day) => (
                  <Picker.Item key={day} label={String(day)} value={day} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.dropdownWrapper}>
            <Text style={styles.dropdownLabel}>Year</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(value) => setSelectedYear(value)}
                style={styles.picker}
              >
                {getYears().map((year) => (
                  <Picker.Item key={year} label={String(year)} value={year} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
        <Text style={styles.selectedDateDisplay}>
          Selected: {months[selectedMonth]} {selectedDay}, {selectedYear}
        </Text>
      </View>

      {selectedDate ? (
        <View style={styles.slotsContainer}>
          <Text style={styles.sectionTitle}>Select Time Slots</Text>
          <Text style={styles.slotsSubtitle}>
            Selected: {selectedSlots.length}/2 slots
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#2196F3" style={{ marginTop: 20 }} />
          ) : (
            timeSlots.map((slot) => {
              const isSelected = selectedSlots.includes(slot);
              const isBooked = bookedSlots.includes(slot);
              return (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.slotButton,
                    isSelected && styles.slotButtonSelected,
                    isBooked && styles.slotButtonBooked
                  ]}
                  onPress={() => !isBooked && handleSlotSelect(slot)}
                  disabled={isBooked}
                >
                  <Text style={[
                    styles.slotText,
                    isSelected && styles.slotTextSelected,
                    isBooked && styles.slotTextBooked
                  ]}>
                    {slot}
                  </Text>
                  <View style={styles.statusContainer}>
                    {isBooked ? (
                      <>
                        <Text style={styles.statusBooked}>✗</Text>
                        <Text style={styles.statusLabelBooked}>Booked</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.statusAvailable}>✓</Text>
                        <Text style={styles.statusLabelAvailable}>Available</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <TouchableOpacity
            style={[
              styles.bookButton,
              selectedSlots.length === 0 && styles.bookButtonDisabled
            ]}
            onPress={handleBooking}
            disabled={selectedSlots.length === 0}
          >
            <Text style={styles.bookButtonText}>
              {selectedSlots.length === 0
                ? 'Select slots to book'
                : `Book ${selectedSlots.length} Slot${selectedSlots.length !== 1 ? 's' : ''}`
              }
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>
            Please select a date to view available time slots
          </Text>
        </View>
      )}

      <ConfirmationModal
        visible={showConfirmModal}
        title="Confirm Booking"
        message={confirmationMessage}
        onCancel={handleCancelBooking}
        onConfirm={handleConfirmBooking}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: '#ff5252',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerContainer: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
    color: '#333',
  },
  dropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 15,
  },
  dropdownWrapper: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  selectedDateDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  slotsContainer: {
    padding: 20,
    paddingTop: 10,
  },
  slotsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  slotButton: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  slotButtonBooked: {
    backgroundColor: '#e0e0e0',
    borderColor: '#ccc',
    opacity: 0.6,
  },
  slotText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  slotTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  slotTextBooked: {
    color: '#999',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusAvailable: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  statusBooked: {
    fontSize: 18,
    color: '#f44336',
    fontWeight: 'bold',
  },
  statusLabelAvailable: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  statusLabelBooked: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 40,
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default BookingScreen;
