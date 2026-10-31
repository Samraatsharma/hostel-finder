package com.hostelfinder.config;

import com.hostelfinder.entity.*;
import com.hostelfinder.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Configuration
public class DemoDataInitializer {

  @Bean
  CommandLineRunner seedDemoData(
      UserRepository userRepository,
      HostelOwnerRepository ownerRepository,
      CityRepository cityRepository,
      AreaRepository areaRepository,
      FacilityRepository facilityRepository,
      HostelRepository hostelRepository,
      PasswordEncoder encoder) {
    return args -> {
      // 1. Seed demo users
      upsertUser(userRepository, encoder, "ADMIN", "Demo Admin", "admin@demo.com", "9999990000");
      User ownerUser = upsertUser(userRepository, encoder, "OWNER", "Demo Owner", "owner@demo.com", "9999990001");
      upsertUser(userRepository, encoder, "STUDENT", "Demo Student", "student@demo.com", "9999990002");

      // 2. Ensure owner is verified in hostel_owners
      if (ownerUser != null && !ownerRepository.existsById(ownerUser.getId())) {
        HostelOwner ho = new HostelOwner();
        ho.setUserId(ownerUser.getId());
        ho.setOwnerStatus("VERIFIED");
        ho.setVerifiedAt(LocalDateTime.now());
        ownerRepository.save(ho);
      }

      // 3. Seed City and Areas if not present
      City indore = null;
      if (cityRepository.count() == 0) {
        City c = new City();
        c.setName("Indore");
        indore = cityRepository.save(c);

        String[] areaNames = {
          "Bhanwarkuan", "Vishnupuri", "Indrapuri", "Rau", "Khandwa Naka",
          "Geeta Bhawan", "Navlakha", "Bengali Square", "Pipliyahana", "Silicon City",
          "Vijay Nagar", "Scheme 54", "Scheme 78", "New Palasia", "Old Palasia",
          "Saket Nagar", "Nipania", "Super Corridor", "Musakhedi", "Pardeshipura",
          "Malwa Mill", "Azad Nagar", "Sudama Nagar", "Gumasta Nagar", "Chhawani",
          "Tukoganj", "Race Course Road", "MG Road", "Rajwada", "Siyaganj", "YN Road"
        };
        for (String aName : areaNames) {
          Area a = new Area();
          a.setCity(indore);
          a.setName(aName);
          areaRepository.save(a);
        }
      } else {
        indore = cityRepository.findAll().get(0);
      }

      // 4. Seed Facilities if not present
      Map<String, Facility> facilityMap = new HashMap<>();
      if (facilityRepository.count() == 0) {
        String[] facs = {"WiFi", "AC", "Laundry", "Parking", "Water Purifier", "Power Backup"};
        for (String fName : facs) {
          Facility f = new Facility();
          f.setName(fName);
          facilityMap.put(fName, facilityRepository.save(f));
        }
      } else {
        for (Facility f : facilityRepository.findAll()) {
          facilityMap.put(f.getName(), f);
        }
      }

      // 5. Seed Hostels if not present
      if (hostelRepository.count() == 0 && ownerUser != null && indore != null) {
        List<Area> areas = areaRepository.findByCity_IdOrderByNameAsc(indore.getId());
        Map<String, Area> areaMap = new HashMap<>();
        for (Area a : areas) {
          areaMap.put(a.getName(), a);
        }

        Area bhanwarkuan = areaMap.getOrDefault("Bhanwarkuan", areas.isEmpty() ? null : areas.get(0));
        Area vijayNagar = areaMap.getOrDefault("Vijay Nagar", areas.isEmpty() ? null : areas.get(0));
        Area oldPalasia = areaMap.getOrDefault("Old Palasia", areas.isEmpty() ? null : areas.get(0));

        // Hostel 1: Shree Boys Hostel
        Hostel h1 = new Hostel();
        h1.setOwnerUserId(ownerUser.getId());
        h1.setCity(indore);
        h1.setArea(bhanwarkuan);
        h1.setHostelName("Shree Boys Hostel");
        h1.setAddressLine("Near DAVV, Bhanwarkuan");
        h1.setDescription("Well-maintained boys hostel with all basic amenities near coaching hub.");
        h1.setImageUrl("/img/hostel_image_1.png");
        h1.setPricePerMonth(BigDecimal.valueOf(6500.00));
        h1.setGenderType("BOYS");
        h1.setMessAvailable(true);
        h1.setStatus("PUBLISHED");
        h1.setTotalRooms(20);
        h1.setAvailableRooms(6);
        Set<Facility> h1Fac = new HashSet<>();
        if (facilityMap.containsKey("WiFi")) h1Fac.add(facilityMap.get("WiFi"));
        if (facilityMap.containsKey("Laundry")) h1Fac.add(facilityMap.get("Laundry"));
        if (facilityMap.containsKey("Power Backup")) h1Fac.add(facilityMap.get("Power Backup"));
        h1.setFacilities(h1Fac);

        HostelRoomType rt1 = new HostelRoomType();
        rt1.setHostel(h1);
        rt1.setRoomType("Standard 2 Bed");
        rt1.setPricePerMonth(BigDecimal.valueOf(6500.00));
        rt1.setTotalRooms(20);
        rt1.setAvailableRooms(6);
        h1.setRoomTypes(new ArrayList<>(List.of(rt1)));
        hostelRepository.save(h1);

        // Hostel 2: Galaxy Girls PG
        Hostel h2 = new Hostel();
        h2.setOwnerUserId(ownerUser.getId());
        h2.setCity(indore);
        h2.setArea(vijayNagar);
        h2.setHostelName("Galaxy Girls PG");
        h2.setAddressLine("Scheme 54, Vijay Nagar");
        h2.setDescription("Premium girls accommodation near C21 Mall with 24/7 security.");
        h2.setImageUrl("/img/hostel_image_2.png");
        h2.setPricePerMonth(BigDecimal.valueOf(8000.00));
        h2.setGenderType("GIRLS");
        h2.setMessAvailable(true);
        h2.setStatus("PUBLISHED");
        h2.setTotalRooms(15);
        h2.setAvailableRooms(2);
        Set<Facility> h2Fac = new HashSet<>();
        if (facilityMap.containsKey("WiFi")) h2Fac.add(facilityMap.get("WiFi"));
        if (facilityMap.containsKey("AC")) h2Fac.add(facilityMap.get("AC"));
        if (facilityMap.containsKey("Water Purifier")) h2Fac.add(facilityMap.get("Water Purifier"));
        h2.setFacilities(h2Fac);

        HostelRoomType rt2 = new HostelRoomType();
        rt2.setHostel(h2);
        rt2.setRoomType("Deluxe 1 Bed");
        rt2.setPricePerMonth(BigDecimal.valueOf(8000.00));
        rt2.setTotalRooms(15);
        rt2.setAvailableRooms(2);
        h2.setRoomTypes(new ArrayList<>(List.of(rt2)));
        hostelRepository.save(h2);

        // Hostel 3: Central Co-ed Hostel
        Hostel h3 = new Hostel();
        h3.setOwnerUserId(ownerUser.getId());
        h3.setCity(indore);
        h3.setArea(oldPalasia);
        h3.setHostelName("Central Co-ed Hostel");
        h3.setAddressLine("Palasia Square");
        h3.setDescription("Modern co-ed hostel with excellent connectivity.");
        h3.setImageUrl("/img/hostel_image_3.png");
        h3.setPricePerMonth(BigDecimal.valueOf(9000.00));
        h3.setGenderType("COED");
        h3.setMessAvailable(false);
        h3.setStatus("PUBLISHED");
        h3.setTotalRooms(12);
        h3.setAvailableRooms(0);
        Set<Facility> h3Fac = new HashSet<>();
        if (facilityMap.containsKey("Parking")) h3Fac.add(facilityMap.get("Parking"));
        h3.setFacilities(h3Fac);

        HostelRoomType rt3 = new HostelRoomType();
        rt3.setHostel(h3);
        rt3.setRoomType("Single Studio");
        rt3.setPricePerMonth(BigDecimal.valueOf(9000.00));
        rt3.setTotalRooms(12);
        rt3.setAvailableRooms(0);
        h3.setRoomTypes(new ArrayList<>(List.of(rt3)));
        hostelRepository.save(h3);
      }
    };
  }

  private User upsertUser(
    UserRepository repo,
    PasswordEncoder encoder,
    String role,
    String name,
    String email,
    String phone
  ) {
    String normalized = email.trim().toLowerCase();
    User u = repo.findByEmail(normalized).orElseGet(User::new);
    u.setRole(role);
    u.setName(name);
    u.setEmail(normalized);
    u.setPhone(phone);
    u.setStatus("ACTIVE");
    u.setPasswordHash(encoder.encode("Demo@123"));
    return repo.save(u);
  }
}
