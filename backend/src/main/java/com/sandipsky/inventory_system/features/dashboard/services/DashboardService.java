package com.sandipsky.inventory_system.features.dashboard.services;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.sandipsky.inventory_system.common.exception.BadRequestException;
import com.sandipsky.inventory_system.common.util.MoneyUtil;
import com.sandipsky.inventory_system.features.dashboard.dtos.AccountTypeBalanceDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.BalanceSummaryDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.DateTotalDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.NearExpiryBatchDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.PurchaseSalesPointDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.PurchaseSummaryDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.PurchaseVsSalesDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.SalesSummaryDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.StockAlertsDTO;
import com.sandipsky.inventory_system.features.dashboard.dtos.StockLevelDTO;
import com.sandipsky.inventory_system.features.dashboard.repositories.DashboardRepository;
import com.sandipsky.inventory_system.features.product.entities.ProductStock;
import com.sandipsky.inventory_system.features.product.services.ProductStockService;
import com.sandipsky.inventory_system.features.user.repositories.UserRepository;

@Service
public class DashboardService {

    static final String CASH = "Cash & Cash Equivalents";
    static final String PAYABLES = "Payables";
    static final String RECEIVABLES = "Receivables";

    // One day, week or month of the purchase vs sales chart, both ends inclusive
    record Period(LocalDate from, LocalDate to) {
    }

    @Autowired
    private DashboardRepository repository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductStockService productStockService;

    public BalanceSummaryDTO getBalances() {
        LocalDate today = LocalDate.now();
        Map<String, Double> now = balancesByType(today);
        Map<String, Double> weekAgo = balancesByType(today.minusDays(7));
        return new BalanceSummaryDTO(
                MoneyUtil.round2(now.getOrDefault(CASH, 0.0)),
                // Payables are a liability: their balance is the credit side
                MoneyUtil.round2(-now.getOrDefault(PAYABLES, 0.0)),
                MoneyUtil.round2(now.getOrDefault(RECEIVABLES, 0.0)),
                MoneyUtil.round2(-weekAgo.getOrDefault(PAYABLES, 0.0)),
                MoneyUtil.round2(weekAgo.getOrDefault(RECEIVABLES, 0.0)));
    }

    // Each series is left out (null) when the user may not view its documents
    public PurchaseVsSalesDTO getPurchaseVsSales(String interval) {
        List<Period> periods = periods(interval, LocalDate.now());
        String fromDate = periods.getFirst().from().toString();
        String toDate = periods.getLast().to().toString();
        List<DateTotalDTO> purchases = can("ViewPurchaseEntry") ? repository.findPurchaseTotalsByDate(fromDate, toDate) : null;
        List<DateTotalDTO> sales = can("ViewSalesEntries") ? repository.findSalesTotalsByDate(fromDate, toDate) : null;

        List<PurchaseSalesPointDTO> points = periods.stream()
                .map(period -> new PurchaseSalesPointDTO(
                        period.from().toString(),
                        period.to().toString(),
                        totalIn(purchases, period),
                        totalIn(sales, period)))
                .toList();
        return new PurchaseVsSalesDTO(interval, points);
    }

    public SalesSummaryDTO getSalesSummary(String fromDate, String toDate) {
        Double sales = can("ViewSalesEntries") ? MoneyUtil.round2(repository.sumSales(fromDate, toDate)) : null;
        Double returns = can("ViewSalesReturns") ? MoneyUtil.round2(repository.sumSalesReturns(fromDate, toDate)) : null;
        Double net = sales != null && returns != null ? MoneyUtil.round2(sales - returns) : null;
        return new SalesSummaryDTO(sales, returns, net);
    }

    public PurchaseSummaryDTO getPurchaseSummary(String fromDate, String toDate) {
        Double purchases = can("ViewPurchaseEntry") ? MoneyUtil.round2(repository.sumPurchases(fromDate, toDate)) : null;
        Double returns = can("ViewPurchaseReturn")
                ? MoneyUtil.round2(repository.sumPurchaseReturns(fromDate, toDate))
                : null;
        return new PurchaseSummaryDTO(purchases, returns);
    }

    // Batches with stock that expire within `months` from today, expired ones included
    public List<NearExpiryBatchDTO> getNearExpiry(int months) {
        if (months < 1) {
            throw new BadRequestException("months must be at least 1");
        }
        String until = LocalDate.now().plusMonths(months).toString();
        return repository.findBatchesExpiringBy(until).stream().map(this::mapToNearExpiry).toList();
    }

    public StockAlertsDTO getStockAlerts() {
        return stockAlerts(repository.findActiveStockLevels());
    }

    static StockAlertsDTO stockAlerts(List<StockLevelDTO> levels) {
        List<StockLevelDTO> minimum = levels.stream()
                .filter(level -> level.getQuantity() > 0
                        && level.getMinStock() != null && level.getMinStock() > 0
                        && level.getQuantity() <= level.getMinStock())
                .sorted(Comparator.comparing(StockLevelDTO::getQuantity))
                .toList();
        List<StockLevelDTO> zero = levels.stream().filter(level -> level.getQuantity() <= 0).toList();
        return new StockAlertsDTO(minimum, zero);
    }

    // The last 30 days, 12 weeks (Sunday to Saturday) or 12 months, oldest first, ending with the one holding today
    static List<Period> periods(String interval, LocalDate today) {
        List<Period> periods = new ArrayList<>();
        switch (interval == null ? "" : interval) {
            case "daily" -> {
                for (int i = 29; i >= 0; i--) {
                    LocalDate day = today.minusDays(i);
                    periods.add(new Period(day, day));
                }
            }
            case "weekly" -> {
                LocalDate sunday = today.minusDays(today.getDayOfWeek().getValue() % 7);
                for (int i = 11; i >= 0; i--) {
                    LocalDate first = sunday.minusWeeks(i);
                    periods.add(new Period(first, first.plusDays(6)));
                }
            }
            case "monthly" -> {
                LocalDate thisMonth = today.withDayOfMonth(1);
                for (int i = 11; i >= 0; i--) {
                    LocalDate first = thisMonth.minusMonths(i);
                    periods.add(new Period(first, first.plusMonths(1).minusDays(1)));
                }
            }
            default -> throw new BadRequestException("interval must be daily, weekly or monthly");
        }
        return periods;
    }

    private static Double totalIn(List<DateTotalDTO> totals, Period period) {
        if (totals == null) {
            return null;
        }
        String from = period.from().toString();
        String to = period.to().toString();
        double sum = totals.stream()
                .filter(total -> total.getDate() != null
                        && total.getDate().compareTo(from) >= 0 && total.getDate().compareTo(to) <= 0)
                .mapToDouble(DateTotalDTO::getTotal)
                .sum();
        return MoneyUtil.round2(sum);
    }

    private Map<String, Double> balancesByType(LocalDate date) {
        return repository.findBalancesByAccountType(date.toString(), List.of(CASH, PAYABLES, RECEIVABLES)).stream()
                .collect(Collectors.toMap(AccountTypeBalanceDTO::getAccountType, AccountTypeBalanceDTO::getNetDebit));
    }

    // Whether the signed-in user's role grants the operation; for figures within an endpoint
    private boolean can(String operation) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.existsByUsernameAndOperation(username, operation);
    }

    private NearExpiryBatchDTO mapToNearExpiry(ProductStock batch) {
        return new NearExpiryBatchDTO(
                batch.getProduct().getId(),
                batch.getProduct().getName(),
                productStockService.batchId(batch),
                batch.getBatchNo(),
                batch.getExpiryDate(),
                batch.getQuantity());
    }
}
