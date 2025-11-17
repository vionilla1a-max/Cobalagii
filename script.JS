// --- Inisialisasi Aplikasi ---

// Kunci untuk localStorage
const APP_KEY = 'fokusMasaDepanDB';

// --- Fungsi Helper (Utility) ---

/**
 * Mengembalikan angka dalam format mata uang Rupiah (Rp).
 * @param {number} number - Angka yang akan diformat.
 * @returns {string} - Angka dalam format Rupiah.
 */
function formatRupiah(number) {
    if (typeof number !== 'number') return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
}

/**
 * Mengembalikan format tanggal ISO (YYYY-MM-DD).
 * @param {Date} date - Objek Date.
 * @returns {string} - Tanggal dalam format YYYY-MM-DD.
 */
function getISODate(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        date = new Date();
    }
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
}

/**
 * Mengembalikan objek data default.
 */
function getDefaultDB() {
    // Tanggal default impian: 1 tahun dari sekarang
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    return {
        saldo: 0,
        dream: {
            title: 'Atur Impian Anda!',
            targetAmount: 0,
            targetDate: getISODate(oneYearFromNow) // Diperbaiki: Default 1 tahun dari sekarang
        },
        settings: {
            limitBulanan: 0, 
            motivasi: {
                kuning: 'Hati-hati, pengeluaranmu banyak!',
                merah: 'STOP! Kamu sudah boros!'
            },
            kategori: [
                '🍜 Makanan', // Diperbaiki: Menggunakan emoji standar
                '🚌 Transportasi', // Diperbaiki: Menggunakan emoji standar
                '🏠 Tempat Tinggal',
                '🛒 Belanja',
                '💡 Tagihan',
                '🎁 Hiburan',
                '💰 Investasi/Tabungan',
                '➕ Lain-lain',
            ],
        },
        transactions: [],
    };
}

/**
 * Mengambil data dari localStorage.
 * @returns {object} - Objek database aplikasi.
 */
function getDB() {
    try {
        const db = JSON.parse(localStorage.getItem(APP_KEY));
        // Jika data tidak ada atau tidak valid, kembalikan default
        return db || getDefaultDB();
    } catch (e) {
        console.error("Gagal memuat DB dari localStorage, mengembalikan default.", e);
        return getDefaultDB();
    }
}

/**
 * Menyimpan data ke localStorage.
 * @param {object} db - Objek database aplikasi.
 */
function saveDB(db) {
    localStorage.setItem(APP_KEY, JSON.stringify(db));
    render(); // Render ulang setelah menyimpan
}

/**
 * Memfilter transaksi berdasarkan periode waktu.
 * @param {string} filter - 'today', 'week', 'month', 'year', 'all'.
 * @returns {Array} - Array transaksi yang telah difilter.
 */
function filterTransactions(filter) {
    const transactions = getDB().transactions || [];
    const now = new Date();
    const today = getISODate(now);

    const year = now.getFullYear();
    const month = now.getMonth();

    // --- Perbaikan Bug: Perhitungan Awal Minggu ---
    // Logika perhitungan yang baru:
    const nowForWeekCalculation = new Date();
    // now.getDay(): Minggu=0, Senin=1, ..., Sabtu=6.
    // + 1 untuk membuat hari Senin sebagai hari pertama (ISO).
    const diff = nowForWeekCalculation.getDate() - nowForWeekCalculation.getDay() + (nowForWeekCalculation.getDay() === 0 ? -6 : 1); // Jika Minggu (0), mundur 6 hari
    const firstDayOfWeek = new Date(nowForWeekCalculation.setDate(diff));
    const startOfWeek = getISODate(firstDayOfWeek);
    // ---------------------------------------------

    // Awal bulan ini
    const startOfMonth = getISODate(new Date(year, month, 1));

    // Awal tahun ini
    const startOfYear = getISODate(new Date(year, 0, 1));

    // Filter
    return transactions.filter(tx => {
        switch (filter) {
            case 'today':
                return tx.date === today;
            case 'week':
                // Perbandingan string YYYY-MM-DD bekerja dengan baik untuk tanggal
                return tx.date >= startOfWeek && tx.date <= today;
            case 'month':
                return tx.date >= startOfMonth && tx.date <= today;
            case 'year':
                return tx.date >= startOfYear && tx.date <= today;
            case 'all':
            default:
                return true;
        }
    });
}

/**
 * Menampilkan notifikasi toast.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {string} type - 'success', 'error', 'default'.
 */
function showToast(message, type = 'default') {
    const toast = document.getElementById('toast');
    if (!toast) return; // Penjaga
    toast.textContent = message;

    // Atur warna berdasarkan tipe
    if (type === 'success') {
        toast.style.backgroundColor = '#22c55e'; // green-500
    } else if (type === 'error' || type === 'danger') { // Diperbaiki: mendukung 'danger'
        toast.style.backgroundColor = '#ef4444'; // red-500
    } else {
        toast.style.backgroundColor = '#333'; // default
    }

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// --- Fungsi Pengaturan UI/Modal ---

/**
 * Menampilkan modal.
 * @param {string} modalId - ID dari modal overlay.
 */
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    // Jika modal overlay adalah modal-tambah-transaksi, atur tanggal hari ini.
    if (modalId === 'modal-tambah-transaksi') {
        document.getElementById('transaksi-date').value = getISODate(new Date());
        renderCategoryOptions();
    }
    // Jika modal-edit-dream, render data dream saat ini
    if (modalId === 'modal-edit-dream') {
        const db = getDB();
        document.getElementById('dream-title').value = db.dream.title;
        document.getElementById('dream-target-amount').value = db.dream.targetAmount;
        document.getElementById('dream-target-date').value = db.dream.targetDate;
    }
    // Jika modal-edit-settings, render data settings
    if (modalId === 'modal-edit-settings') {
        const db = getDB();
        document.getElementById('setting-limit-bulanan').value = db.settings.limitBulanan;
        document.getElementById('setting-motivasi-kuning').value = db.settings.motivasi.kuning;
        document.getElementById('setting-motivasi-merah').value = db.settings.motivasi.merah;
        renderKategoriSetting(db.settings.kategori);
    }
}

/**
 * Menyembunyikan modal.
 * @param {string} modalId - ID dari modal overlay.
 */
function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// --- Fungsi CRUD Transaksi ---

/**
 * Menambahkan transaksi baru.
 */
function addTransaction() {
    const type = document.getElementById('transaksi-type').value;
    const amount = parseInt(document.getElementById('transaksi-amount').value);
    const category = document.getElementById('transaksi-category').value;
    const description = document.getElementById('transaksi-description').value;
    const date = document.getElementById('transaksi-date').value;

    if (isNaN(amount) || amount <= 0 || !category || !date) {
        showToast('Jumlah, kategori, dan tanggal tidak boleh kosong!', 'error');
        return;
    }

    const db = getDB();
    const newTransaction = {
        id: Date.now(), // ID unik
        type: type,
        amount: amount,
        category: category,
        description: description,
        date: date,
        createdAt: new Date().toISOString()
    };

    db.transactions.push(newTransaction);

    // Update saldo
    if (type === 'income') {
        db.saldo += amount;
    } else {
        db.saldo -= amount;
    }

    saveDB(db);
    hideModal('modal-tambah-transaksi');
    showToast('Transaksi berhasil ditambahkan!', 'success');

    // Reset form
    document.getElementById('form-transaksi').reset();
}


// --- Fungsi Rendering ---

/**
 * Mengisi opsi kategori di form transaksi.
 */
function renderCategoryOptions() {
    const categorySelect = document.getElementById('transaksi-category');
    const categories = getDB().settings.kategori || [];

    // Hapus opsi lama
    categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}

/**
 * Merender daftar transaksi di UI.
 */
function renderTransactions() {
    const listElement = document.getElementById('transaction-list');
    const filterValue = document.getElementById('filter-select').value;
    
    // 1. Filter Transaksi
    const filteredTransactions = filterTransactions(filterValue);

    // 2. Sorting (Terbaru di atas)
    // Diperbaiki: Menggunakan salinan ([...]) sebelum .reverse() agar array asli tidak termutasi
    const transactionsToRender = [...filteredTransactions].reverse();

    listElement.innerHTML = '';

    if (transactionsToRender.length === 0) {
        listElement.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>Belum ada transaksi di periode ini.</p>
                <p>Ayo tambahkan yang pertama!</p>
            </div>
        `;
        return;
    }

    transactionsToRender.forEach(tx => {
        const typeClass = tx.type === 'income' ? 'text-success' : 'text-danger';
        const sign = tx.type === 'income' ? '+' : '-';
        
        const item = document.createElement('li');
        item.className = 'flex justify-between items-center py-3 border-b';
        item.innerHTML = `
            <div class="flex-1 min-w-0 pr-4">
                <p class="font-semibold">${tx.category}</p>
                <p class="text-sm text-gray-500 truncate">${tx.description || '-'}</p>
                <p class="text-xs text-gray-400">${tx.date}</p>
            </div>
            <div class="text-right">
                <p class="${typeClass} font-bold">${sign} ${formatRupiah(tx.amount)}</p>
            </div>
        `;
        listElement.appendChild(item);
    });
}

/**
 * Merender informasi saldo, impian, dan ringkasan.
 */
function renderOverview() {
    const db = getDB();

    // Saldo
    document.getElementById('current-saldo').textContent = formatRupiah(db.saldo); // Diperbaiki: Format Rupiah

    // Ringkasan periode (total masuk/keluar)
    const filterValue = document.getElementById('filter-select').value;
    const filteredTx = filterTransactions(filterValue);
    
    const totalIncome = filteredTx
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);

    const totalExpense = filteredTx
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

    document.getElementById('summary-income').textContent = formatRupiah(totalIncome); // Diperbaiki: Format Rupiah
    document.getElementById('summary-expense').textContent = formatRupiah(totalExpense); // Diperbaiki: Format Rupiah
    document.getElementById('summary-period').textContent = document.querySelector(`#filter-select option[value="${filterValue}"]`).textContent;

    // Impian
    document.getElementById('dream-title-display').textContent = db.dream.title;
    document.getElementById('dream-target-display').textContent = formatRupiah(db.dream.targetAmount); // Diperbaiki: Format Rupiah
    
    const progress = db.dream.targetAmount > 0 
        ? Math.min(100, Math.round((db.saldo / db.dream.targetAmount) * 100)) 
        : 0;

    document.getElementById('dream-progress-bar').style.width = `${progress}%`;
    document.getElementById('dream-progress-text').textContent = `${progress}%`;
    document.getElementById('dream-date-display').textContent = db.dream.targetDate;

    // Perhitungan limit bulanan
    renderLimitStatus(db, totalExpense);
    
    // Perhitungan Chart (belum termasuk dalam snippet ini, akan dipanggil di render())
}

/**
 * Merender status limit bulanan.
 * @param {object} db - Objek database.
 * @param {number} totalExpense - Total pengeluaran bulan ini.
 */
function renderLimitStatus(db, totalExpense) {
    const limitDisplay = document.getElementById('limit-bulanan-status');
    const limitAmountDisplay = document.getElementById('limit-amount-display');
    const motivasiDisplay = document.getElementById('motivasi-text');
    
    const limit = db.settings.limitBulanan;
    limitAmountDisplay.textContent = formatRupiah(limit); // Diperbaiki: Format Rupiah

    if (limit <= 0) {
        limitDisplay.className = 'text-gray-500';
        motivasiDisplay.textContent = 'Atur Limit Bulanan Anda di Pengaturan!';
        return;
    }

    const percentage = (totalExpense / limit) * 100;

    let statusText;
    let statusClass;
    let motivasi;

    if (percentage < 70) {
        statusText = 'Aman';
        statusClass = 'text-success';
        motivasi = 'Lanjutkan! Pengeluaranmu masih terkendali.';
    } else if (percentage < 100) {
        statusText = 'Hati-hati';
        statusClass = 'text-warning';
        motivasi = db.settings.motivasi.kuning || 'Hati-hati, pengeluaranmu banyak!';
    } else {
        statusText = 'Over Limit';
        statusClass = 'text-danger';
        motivasi = db.settings.motivasi.merah || 'STOP! Kamu sudah boros!';
    }

    limitDisplay.textContent = statusText;
    limitDisplay.className = statusClass;
    motivasiDisplay.textContent = motivasi;
}


// --- Fungsi Settings ---

/**
 * Merender daftar kategori yang dapat diatur di settings.
 * @param {Array} categories - Array kategori saat ini.
 */
function renderKategoriSetting(categories) {
    const list = document.getElementById('kategori-list-setting');
    list.innerHTML = '';

    categories.forEach((cat, index) => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center py-2 border-b';
        item.innerHTML = `
            <input type="text" value="${cat}" data-index="${index}" class="kategori-input-setting flex-1 p-2 border rounded-lg focus:ring-primary focus:border-primary" />
            <button onclick="removeKategoriSetting(${index})" class="ml-3 p-2 text-danger hover:bg-red-100 rounded-full">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        list.appendChild(item);
    });

    // Tambahkan input untuk kategori baru
    const newItem = document.createElement('div');
    newItem.className = 'flex justify-between items-center py-2';
    newItem.innerHTML = `
        <input type="text" id="new-kategori-input" placeholder="Masukkan kategori baru (mis. ✈️ Liburan)" class="flex-1 p-2 border rounded-lg focus:ring-primary focus:border-primary" />
        <button onclick="addKategoriSetting()" class="ml-3 p-2 text-primary hover:bg-green-100 rounded-full">
            <i class="fas fa-plus-circle"></i>
        </button>
    `;
    list.appendChild(newItem);
}

/**
 * Menambahkan kategori baru di settings.
 */
function addKategoriSetting() {
    const input = document.getElementById('new-kategori-input');
    const newCat = input.value.trim();

    if (newCat) {
        const db = getDB();
        if (!db.settings.kategori.includes(newCat)) {
            db.settings.kategori.push(newCat);
            saveDB(db);
            renderKategoriSetting(db.settings.kategori);
            showToast(`Kategori "${newCat}" berhasil ditambahkan!`, 'success');
        } else {
            showToast('Kategori sudah ada.', 'error');
        }
    }
}

/**
 * Menghapus kategori di settings.
 * @param {number} index - Indeks kategori yang akan dihapus.
 */
function removeKategoriSetting(index) {
    const db = getDB();
    const kategori = db.settings.kategori.splice(index, 1);
    saveDB(db);
    renderKategoriSetting(db.settings.kategori);
    showToast(`Kategori "${kategori[0]}" berhasil dihapus.`, 'success');
}

/**
 * Menyimpan data impian dari modal.
 */
function saveDream() {
    const title = document.getElementById('dream-title').value.trim();
    const amount = parseInt(document.getElementById('dream-target-amount').value);
    const date = document.getElementById('dream-target-date').value;

    if (!title || isNaN(amount) || amount <= 0 || !date) {
        showToast('Semua kolom impian harus diisi dengan benar.', 'error');
        return;
    }

    const db = getDB();
    db.dream.title = title;
    db.dream.targetAmount = amount;
    db.dream.targetDate = date;

    saveDB(db);
    hideModal('modal-edit-dream');
    showToast('Impian berhasil disimpan!', 'success');
}

/**
 * Menyimpan data pengaturan dari modal.
 */
function saveSettings() {
    const limit = parseInt(document.getElementById('setting-limit-bulanan').value);
    const motivasiKuning = document.getElementById('setting-motivasi-kuning').value.trim();
    const motivasiMerah = document.getElementById('setting-motivasi-merah').value.trim();

    if (isNaN(limit) || limit < 0 || !motivasiKuning || !motivasiMerah) {
        showToast('Semua kolom pengaturan harus diisi dengan benar.', 'error');
        return;
    }

    const db = getDB();
    db.settings.limitBulanan = limit;
    db.settings.motivasi.kuning = motivasiKuning;
    db.settings.motivasi.merah = motivasiMerah;

    // Ambil data kategori yang sudah diedit
    const kategoriInputs = document.querySelectorAll('.kategori-input-setting');
    db.settings.kategori = Array.from(kategoriInputs).map(input => input.value.trim()).filter(val => val); // Filter yang kosong

    saveDB(db);
    hideModal('modal-edit-settings');
    showToast('Pengaturan berhasil disimpan!', 'success');
}

/**
 * Me-reset aplikasi ke kondisi awal.
 */
function resetApp() {
    if (confirm('Anda yakin ingin me-reset aplikasi? Semua data akan hilang!')) {
        localStorage.removeItem(APP_KEY);
        showToast('Aplikasi berhasil direset!', 'success');
        window.location.reload();
    }
}


// --- Fungsi Chart (Analisis) ---

let expenseChart;

/**
 * Merender grafik pengeluaran berdasarkan kategori.
 */
function renderExpenseChart() {
    const db = getDB();
    
    // Ambil pengeluaran bulan ini
    const monthlyExpenses = db.transactions
        .filter(tx => tx.type === 'expense' && tx.date.substring(0, 7) === getISODate(new Date()).substring(0, 7));

    // Hitung total per kategori
    const categoryTotals = monthlyExpenses.reduce((acc, tx) => {
        const category = tx.category.split(' ')[0] || 'Lain-lain'; // Ambil bagian emoji/pertama
        acc[category] = (acc[category] || 0) + tx.amount;
        return acc;
    }, {});

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);
    
    // Warna yang lebih menarik untuk chart (random warna pastel)
    const backgroundColors = labels.map((_, i) => {
        const hue = (i * 137.508) % 360; // Sudut emas
        return `hsl(${hue}, 70%, 70%)`;
    });

    const ctx = document.getElementById('expense-chart').getContext('2d');

    // Hancurkan chart lama jika ada
    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            return `${tooltipItem.label}: ${formatRupiah(tooltipItem.raw)}`;
                        }
                    }
                }
            }
        }
    });
}


// --- Fungsi Render Global ---

/**
 * Fungsi utama untuk merender semua bagian aplikasi.
 */
function render() {
    renderOverview();
    renderTransactions();
    // Render chart hanya jika kita di halaman analisis (Tab 3)
    if (document.getElementById('page-analisis').classList.contains('active')) {
        renderExpenseChart();
    }
}

/**
 * Mengganti halaman aktif.
 * @param {string} pageId - ID halaman yang akan diaktifkan.
 */
function changePage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');

    // Pastikan render chart dipanggil saat pindah ke halaman analisis
    if (pageId === 'page-analisis') {
        renderExpenseChart();
    }
    
    // Render ulang saat pindah halaman
    render(); 
}

// --- Inisialisasi Event Listener ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inisialisasi aplikasi (tampilkan halaman utama)
    changePage('page-beranda');
    
    // 2. Event Listener untuk Form Transaksi
    document.getElementById('form-transaksi').addEventListener('submit', (e) => {
        e.preventDefault();
        addTransaction();
    });

    // 3. Event Listener untuk Filter Transaksi
    document.getElementById('filter-select').addEventListener('change', render);

    // 4. Event Listener untuk Form Impian
    document.getElementById('form-edit-dream').addEventListener('submit', (e) => {
        e.preventDefault();
        saveDream();
    });

    // 5. Event Listener untuk Form Settings
    document.getElementById('form-edit-settings').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
    });
    
    // Panggil render pertama kali
    render();
});// --- Inisialisasi Aplikasi ---

// Kunci untuk localStorage
const APP_KEY = 'fokusMasaDepanDB';

// --- Fungsi Helper (Utility) ---

/**
 * Mengembalikan angka dalam format mata uang Rupiah (Rp).
 * @param {number} number - Angka yang akan diformat.
 * @returns {string} - Angka dalam format Rupiah.
 */
function formatRupiah(number) {
    if (typeof number !== 'number') return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
}

/**
 * Mengembalikan format tanggal ISO (YYYY-MM-DD).
 * @param {Date} date - Objek Date.
 * @returns {string} - Tanggal dalam format YYYY-MM-DD.
 */
function getISODate(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        date = new Date();
    }
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
}

/**
 * Mengembalikan objek data default.
 */
function getDefaultDB() {
    // Tanggal default impian: 1 tahun dari sekarang
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    return {
        saldo: 0,
        dream: {
            title: 'Atur Impian Anda!',
            targetAmount: 0,
            targetDate: getISODate(oneYearFromNow) // Diperbaiki: Default 1 tahun dari sekarang
        },
        settings: {
            limitBulanan: 0, 
            motivasi: {
                kuning: 'Hati-hati, pengeluaranmu banyak!',
                merah: 'STOP! Kamu sudah boros!'
            },
            kategori: [
                '🍜 Makanan', // Diperbaiki: Menggunakan emoji standar
                '🚌 Transportasi', // Diperbaiki: Menggunakan emoji standar
                '🏠 Tempat Tinggal',
                '🛒 Belanja',
                '💡 Tagihan',
                '🎁 Hiburan',
                '💰 Investasi/Tabungan',
                '➕ Lain-lain',
            ],
        },
        transactions: [],
    };
}

/**
 * Mengambil data dari localStorage.
 * @returns {object} - Objek database aplikasi.
 */
function getDB() {
    try {
        const db = JSON.parse(localStorage.getItem(APP_KEY));
        // Jika data tidak ada atau tidak valid, kembalikan default
        return db || getDefaultDB();
    } catch (e) {
        console.error("Gagal memuat DB dari localStorage, mengembalikan default.", e);
        return getDefaultDB();
    }
}

/**
 * Menyimpan data ke localStorage.
 * @param {object} db - Objek database aplikasi.
 */
function saveDB(db) {
    localStorage.setItem(APP_KEY, JSON.stringify(db));
    render(); // Render ulang setelah menyimpan
}

/**
 * Memfilter transaksi berdasarkan periode waktu.
 * @param {string} filter - 'today', 'week', 'month', 'year', 'all'.
 * @returns {Array} - Array transaksi yang telah difilter.
 */
function filterTransactions(filter) {
    const transactions = getDB().transactions || [];
    const now = new Date();
    const today = getISODate(now);

    const year = now.getFullYear();
    const month = now.getMonth();

    // --- Perbaikan Bug: Perhitungan Awal Minggu ---
    // Logika perhitungan yang baru:
    const nowForWeekCalculation = new Date();
    // now.getDay(): Minggu=0, Senin=1, ..., Sabtu=6.
    // + 1 untuk membuat hari Senin sebagai hari pertama (ISO).
    const diff = nowForWeekCalculation.getDate() - nowForWeekCalculation.getDay() + (nowForWeekCalculation.getDay() === 0 ? -6 : 1); // Jika Minggu (0), mundur 6 hari
    const firstDayOfWeek = new Date(nowForWeekCalculation.setDate(diff));
    const startOfWeek = getISODate(firstDayOfWeek);
    // ---------------------------------------------

    // Awal bulan ini
    const startOfMonth = getISODate(new Date(year, month, 1));

    // Awal tahun ini
    const startOfYear = getISODate(new Date(year, 0, 1));

    // Filter
    return transactions.filter(tx => {
        switch (filter) {
            case 'today':
                return tx.date === today;
            case 'week':
                // Perbandingan string YYYY-MM-DD bekerja dengan baik untuk tanggal
                return tx.date >= startOfWeek && tx.date <= today;
            case 'month':
                return tx.date >= startOfMonth && tx.date <= today;
            case 'year':
                return tx.date >= startOfYear && tx.date <= today;
            case 'all':
            default:
                return true;
        }
    });
}

/**
 * Menampilkan notifikasi toast.
 * @param {string} message - Pesan yang akan ditampilkan.
 * @param {string} type - 'success', 'error', 'default'.
 */
function showToast(message, type = 'default') {
    const toast = document.getElementById('toast');
    if (!toast) return; // Penjaga
    toast.textContent = message;

    // Atur warna berdasarkan tipe
    if (type === 'success') {
        toast.style.backgroundColor = '#22c55e'; // green-500
    } else if (type === 'error' || type === 'danger') { // Diperbaiki: mendukung 'danger'
        toast.style.backgroundColor = '#ef4444'; // red-500
    } else {
        toast.style.backgroundColor = '#333'; // default
    }

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// --- Fungsi Pengaturan UI/Modal ---

/**
 * Menampilkan modal.
 * @param {string} modalId - ID dari modal overlay.
 */
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    // Jika modal overlay adalah modal-tambah-transaksi, atur tanggal hari ini.
    if (modalId === 'modal-tambah-transaksi') {
        document.getElementById('transaksi-date').value = getISODate(new Date());
        renderCategoryOptions();
    }
    // Jika modal-edit-dream, render data dream saat ini
    if (modalId === 'modal-edit-dream') {
        const db = getDB();
        document.getElementById('dream-title').value = db.dream.title;
        document.getElementById('dream-target-amount').value = db.dream.targetAmount;
        document.getElementById('dream-target-date').value = db.dream.targetDate;
    }
    // Jika modal-edit-settings, render data settings
    if (modalId === 'modal-edit-settings') {
        const db = getDB();
        document.getElementById('setting-limit-bulanan').value = db.settings.limitBulanan;
        document.getElementById('setting-motivasi-kuning').value = db.settings.motivasi.kuning;
        document.getElementById('setting-motivasi-merah').value = db.settings.motivasi.merah;
        renderKategoriSetting(db.settings.kategori);
    }
}

/**
 * Menyembunyikan modal.
 * @param {string} modalId - ID dari modal overlay.
 */
function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// --- Fungsi CRUD Transaksi ---

/**
 * Menambahkan transaksi baru.
 */
function addTransaction() {
    const type = document.getElementById('transaksi-type').value;
    const amount = parseInt(document.getElementById('transaksi-amount').value);
    const category = document.getElementById('transaksi-category').value;
    const description = document.getElementById('transaksi-description').value;
    const date = document.getElementById('transaksi-date').value;

    if (isNaN(amount) || amount <= 0 || !category || !date) {
        showToast('Jumlah, kategori, dan tanggal tidak boleh kosong!', 'error');
        return;
    }

    const db = getDB();
    const newTransaction = {
        id: Date.now(), // ID unik
        type: type,
        amount: amount,
        category: category,
        description: description,
        date: date,
        createdAt: new Date().toISOString()
    };

    db.transactions.push(newTransaction);

    // Update saldo
    if (type === 'income') {
        db.saldo += amount;
    } else {
        db.saldo -= amount;
    }

    saveDB(db);
    hideModal('modal-tambah-transaksi');
    showToast('Transaksi berhasil ditambahkan!', 'success');

    // Reset form
    document.getElementById('form-transaksi').reset();
}


// --- Fungsi Rendering ---

/**
 * Mengisi opsi kategori di form transaksi.
 */
function renderCategoryOptions() {
    const categorySelect = document.getElementById('transaksi-category');
    const categories = getDB().settings.kategori || [];

    // Hapus opsi lama
    categorySelect.innerHTML = '<option value="">Pilih Kategori</option>';

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });
}

/**
 * Merender daftar transaksi di UI.
 */
function renderTransactions() {
    const listElement = document.getElementById('transaction-list');
    const filterValue = document.getElementById('filter-select').value;
    
    // 1. Filter Transaksi
    const filteredTransactions = filterTransactions(filterValue);

    // 2. Sorting (Terbaru di atas)
    // Diperbaiki: Menggunakan salinan ([...]) sebelum .reverse() agar array asli tidak termutasi
    const transactionsToRender = [...filteredTransactions].reverse();

    listElement.innerHTML = '';

    if (transactionsToRender.length === 0) {
        listElement.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>Belum ada transaksi di periode ini.</p>
                <p>Ayo tambahkan yang pertama!</p>
            </div>
        `;
        return;
    }

    transactionsToRender.forEach(tx => {
        const typeClass = tx.type === 'income' ? 'text-success' : 'text-danger';
        const sign = tx.type === 'income' ? '+' : '-';
        
        const item = document.createElement('li');
        item.className = 'flex justify-between items-center py-3 border-b';
        item.innerHTML = `
            <div class="flex-1 min-w-0 pr-4">
                <p class="font-semibold">${tx.category}</p>
                <p class="text-sm text-gray-500 truncate">${tx.description || '-'}</p>
                <p class="text-xs text-gray-400">${tx.date}</p>
            </div>
            <div class="text-right">
                <p class="${typeClass} font-bold">${sign} ${formatRupiah(tx.amount)}</p>
            </div>
        `;
        listElement.appendChild(item);
    });
}

/**
 * Merender informasi saldo, impian, dan ringkasan.
 */
function renderOverview() {
    const db = getDB();

    // Saldo
    document.getElementById('current-saldo').textContent = formatRupiah(db.saldo); // Diperbaiki: Format Rupiah

    // Ringkasan periode (total masuk/keluar)
    const filterValue = document.getElementById('filter-select').value;
    const filteredTx = filterTransactions(filterValue);
    
    const totalIncome = filteredTx
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);

    const totalExpense = filteredTx
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

    document.getElementById('summary-income').textContent = formatRupiah(totalIncome); // Diperbaiki: Format Rupiah
    document.getElementById('summary-expense').textContent = formatRupiah(totalExpense); // Diperbaiki: Format Rupiah
    document.getElementById('summary-period').textContent = document.querySelector(`#filter-select option[value="${filterValue}"]`).textContent;

    // Impian
    document.getElementById('dream-title-display').textContent = db.dream.title;
    document.getElementById('dream-target-display').textContent = formatRupiah(db.dream.targetAmount); // Diperbaiki: Format Rupiah
    
    const progress = db.dream.targetAmount > 0 
        ? Math.min(100, Math.round((db.saldo / db.dream.targetAmount) * 100)) 
        : 0;

    document.getElementById('dream-progress-bar').style.width = `${progress}%`;
    document.getElementById('dream-progress-text').textContent = `${progress}%`;
    document.getElementById('dream-date-display').textContent = db.dream.targetDate;

    // Perhitungan limit bulanan
    renderLimitStatus(db, totalExpense);
    
    // Perhitungan Chart (belum termasuk dalam snippet ini, akan dipanggil di render())
}

/**
 * Merender status limit bulanan.
 * @param {object} db - Objek database.
 * @param {number} totalExpense - Total pengeluaran bulan ini.
 */
function renderLimitStatus(db, totalExpense) {
    const limitDisplay = document.getElementById('limit-bulanan-status');
    const limitAmountDisplay = document.getElementById('limit-amount-display');
    const motivasiDisplay = document.getElementById('motivasi-text');
    
    const limit = db.settings.limitBulanan;
    limitAmountDisplay.textContent = formatRupiah(limit); // Diperbaiki: Format Rupiah

    if (limit <= 0) {
        limitDisplay.className = 'text-gray-500';
        motivasiDisplay.textContent = 'Atur Limit Bulanan Anda di Pengaturan!';
        return;
    }

    const percentage = (totalExpense / limit) * 100;

    let statusText;
    let statusClass;
    let motivasi;

    if (percentage < 70) {
        statusText = 'Aman';
        statusClass = 'text-success';
        motivasi = 'Lanjutkan! Pengeluaranmu masih terkendali.';
    } else if (percentage < 100) {
        statusText = 'Hati-hati';
        statusClass = 'text-warning';
        motivasi = db.settings.motivasi.kuning || 'Hati-hati, pengeluaranmu banyak!';
    } else {
        statusText = 'Over Limit';
        statusClass = 'text-danger';
        motivasi = db.settings.motivasi.merah || 'STOP! Kamu sudah boros!';
    }

    limitDisplay.textContent = statusText;
    limitDisplay.className = statusClass;
    motivasiDisplay.textContent = motivasi;
}


// --- Fungsi Settings ---

/**
 * Merender daftar kategori yang dapat diatur di settings.
 * @param {Array} categories - Array kategori saat ini.
 */
function renderKategoriSetting(categories) {
    const list = document.getElementById('kategori-list-setting');
    list.innerHTML = '';

    categories.forEach((cat, index) => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center py-2 border-b';
        item.innerHTML = `
            <input type="text" value="${cat}" data-index="${index}" class="kategori-input-setting flex-1 p-2 border rounded-lg focus:ring-primary focus:border-primary" />
            <button onclick="removeKategoriSetting(${index})" class="ml-3 p-2 text-danger hover:bg-red-100 rounded-full">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        list.appendChild(item);
    });

    // Tambahkan input untuk kategori baru
    const newItem = document.createElement('div');
    newItem.className = 'flex justify-between items-center py-2';
    newItem.innerHTML = `
        <input type="text" id="new-kategori-input" placeholder="Masukkan kategori baru (mis. ✈️ Liburan)" class="flex-1 p-2 border rounded-lg focus:ring-primary focus:border-primary" />
        <button onclick="addKategoriSetting()" class="ml-3 p-2 text-primary hover:bg-green-100 rounded-full">
            <i class="fas fa-plus-circle"></i>
        </button>
    `;
    list.appendChild(newItem);
}

/**
 * Menambahkan kategori baru di settings.
 */
function addKategoriSetting() {
    const input = document.getElementById('new-kategori-input');
    const newCat = input.value.trim();

    if (newCat) {
        const db = getDB();
        if (!db.settings.kategori.includes(newCat)) {
            db.settings.kategori.push(newCat);
            saveDB(db);
            renderKategoriSetting(db.settings.kategori);
            showToast(`Kategori "${newCat}" berhasil ditambahkan!`, 'success');
        } else {
            showToast('Kategori sudah ada.', 'error');
        }
    }
}

/**
 * Menghapus kategori di settings.
 * @param {number} index - Indeks kategori yang akan dihapus.
 */
function removeKategoriSetting(index) {
    const db = getDB();
    const kategori = db.settings.kategori.splice(index, 1);
    saveDB(db);
    renderKategoriSetting(db.settings.kategori);
    showToast(`Kategori "${kategori[0]}" berhasil dihapus.`, 'success');
}

/**
 * Menyimpan data impian dari modal.
 */
function saveDream() {
    const title = document.getElementById('dream-title').value.trim();
    const amount = parseInt(document.getElementById('dream-target-amount').value);
    const date = document.getElementById('dream-target-date').value;

    if (!title || isNaN(amount) || amount <= 0 || !date) {
        showToast('Semua kolom impian harus diisi dengan benar.', 'error');
        return;
    }

    const db = getDB();
    db.dream.title = title;
    db.dream.targetAmount = amount;
    db.dream.targetDate = date;

    saveDB(db);
    hideModal('modal-edit-dream');
    showToast('Impian berhasil disimpan!', 'success');
}

/**
 * Menyimpan data pengaturan dari modal.
 */
function saveSettings() {
    const limit = parseInt(document.getElementById('setting-limit-bulanan').value);
    const motivasiKuning = document.getElementById('setting-motivasi-kuning').value.trim();
    const motivasiMerah = document.getElementById('setting-motivasi-merah').value.trim();

    if (isNaN(limit) || limit < 0 || !motivasiKuning || !motivasiMerah) {
        showToast('Semua kolom pengaturan harus diisi dengan benar.', 'error');
        return;
    }

    const db = getDB();
    db.settings.limitBulanan = limit;
    db.settings.motivasi.kuning = motivasiKuning;
    db.settings.motivasi.merah = motivasiMerah;

    // Ambil data kategori yang sudah diedit
    const kategoriInputs = document.querySelectorAll('.kategori-input-setting');
    db.settings.kategori = Array.from(kategoriInputs).map(input => input.value.trim()).filter(val => val); // Filter yang kosong

    saveDB(db);
    hideModal('modal-edit-settings');
    showToast('Pengaturan berhasil disimpan!', 'success');
}

/**
 * Me-reset aplikasi ke kondisi awal.
 */
function resetApp() {
    if (confirm('Anda yakin ingin me-reset aplikasi? Semua data akan hilang!')) {
        localStorage.removeItem(APP_KEY);
        showToast('Aplikasi berhasil direset!', 'success');
        window.location.reload();
    }
}


// --- Fungsi Chart (Analisis) ---

let expenseChart;

/**
 * Merender grafik pengeluaran berdasarkan kategori.
 */
function renderExpenseChart() {
    const db = getDB();
    
    // Ambil pengeluaran bulan ini
    const monthlyExpenses = db.transactions
        .filter(tx => tx.type === 'expense' && tx.date.substring(0, 7) === getISODate(new Date()).substring(0, 7));

    // Hitung total per kategori
    const categoryTotals = monthlyExpenses.reduce((acc, tx) => {
        const category = tx.category.split(' ')[0] || 'Lain-lain'; // Ambil bagian emoji/pertama
        acc[category] = (acc[category] || 0) + tx.amount;
        return acc;
    }, {});

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);
    
    // Warna yang lebih menarik untuk chart (random warna pastel)
    const backgroundColors = labels.map((_, i) => {
        const hue = (i * 137.508) % 360; // Sudut emas
        return `hsl(${hue}, 70%, 70%)`;
    });

    const ctx = document.getElementById('expense-chart').getContext('2d');

    // Hancurkan chart lama jika ada
    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: backgroundColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            return `${tooltipItem.label}: ${formatRupiah(tooltipItem.raw)}`;
                        }
                    }
                }
            }
        }
    });
}


// --- Fungsi Render Global ---

/**
 * Fungsi utama untuk merender semua bagian aplikasi.
 */
function render() {
    renderOverview();
    renderTransactions();
    // Render chart hanya jika kita di halaman analisis (Tab 3)
    if (document.getElementById('page-analisis').classList.contains('active')) {
        renderExpenseChart();
    }
}

/**
 * Mengganti halaman aktif.
 * @param {string} pageId - ID halaman yang akan diaktifkan.
 */
function changePage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');

    // Pastikan render chart dipanggil saat pindah ke halaman analisis
    if (pageId === 'page-analisis') {
        renderExpenseChart();
    }
    
    // Render ulang saat pindah halaman
    render(); 
}

// --- Inisialisasi Event Listener ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inisialisasi aplikasi (tampilkan halaman utama)
    changePage('page-beranda');
    
    // 2. Event Listener untuk Form Transaksi
    document.getElementById('form-transaksi').addEventListener('submit', (e) => {
        e.preventDefault();
        addTransaction();
    });

    // 3. Event Listener untuk Filter Transaksi
    document.getElementById('filter-select').addEventListener('change', render);

    // 4. Event Listener untuk Form Impian
    document.getElementById('form-edit-dream').addEventListener('submit', (e) => {
        e.preventDefault();
        saveDream();
    });

    // 5. Event Listener untuk Form Settings
    document.getElementById('form-edit-settings').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
    });
    
    // Panggil render pertama kali
    render();
});
