(() => {
  "use strict";

  window.GAME_CONTENT = {
    minChars: 10,
    title: "EKSPEDISI BAJAK LAUT PERSAHABATAN",
    subtitle: "Berlayar, Pahami Konflik, Temukan Harta Karun Solusi!",
    story: [
      "Salsa dan Rani bersahabat sejak kelas VII dan satu kelompok proyek IPS di kelas IX. Salsa mengerjakan hampir semua bagian karena Rani sering izin latihan ekskul dan belum mengumpulkan bagiannya.",
      "Saat presentasi, guru memuji kelompok mereka, dan Rani ikut menerima pujian.",
      "Setelah presentasi, di depan teman-teman, Salsa berkata, 'Enak ya, tinggal ikut nama.' Rani malu dan tersinggung. Sejak itu keduanya saling menghindar di kelas, padahal masih ada proyek kelompok berikutnya.",
      "Satu hari sebelum presentasi, Salsa sempat ingin menegur Rani, tetapi memilih diam supaya tidak ribut."
    ],
    islands: [
      { id: 1, name: "Dengarkan", color: "green", icon: "🔭", skill: "Kenali masalah" },
      { id: 2, name: "Pahami", color: "orange", icon: "💛", skill: "Lihat dua sudut pandang" },
      { id: 3, name: "Pikirkan", color: "purple", icon: "💡", skill: "Pertimbangkan akibat" },
      { id: 4, name: "Temukan Solusi", color: "blue", icon: "⚓", skill: "Pilih langkah bijak" }
    ],
    questions: {
      l1: [
        "Apa yang sebenarnya terjadi antara Salsa dan Rani?",
        "Apa pemicu utama konflik mereka?",
        "Apa dampak konflik terhadap persahabatan dan proyek berikutnya?"
      ],
      l2: {
        salsa: [
          "Apa yang mungkin dipikirkan Salsa?",
          "Apa yang mungkin dirasakan Salsa?",
          "Apa kebutuhan Salsa yang belum terpenuhi?"
        ],
        rani: [
          "Apa yang mungkin dipikirkan Rani?",
          "Apa yang mungkin dirasakan Rani?",
          "Apa kebutuhan Rani yang belum terpenuhi?"
        ]
      },
      l3: [
        "Apa akibat yang mungkin muncul?",
        "Bagaimana perasaan kedua tokoh setelah tindakan tersebut?",
        "Apakah tindakan tersebut membantu proyek berikutnya?",
        "Apa alternatif tindakan lain yang mungkin lebih baik?"
      ],
      l4: [
        "Apa langkah pertama yang sebaiknya dilakukan Salsa?",
        "Bagaimana Rani dapat menyampaikan perasaannya sekaligus bertanggung jawab terhadap tugas?",
        "Bagaimana mereka dapat menyepakati pembagian tugas proyek berikutnya?",
        "Apa yang dapat dilakukan jika percakapan belum menghasilkan kesepakatan?"
      ],
      final: [
        "Apa pelajaran terpenting dari konflik Salsa dan Rani?",
        "Apa yang akan kamu lakukan jika menghadapi konflik serupa?",
        "Keterampilan apa yang ingin kamu tingkatkan?"
      ]
    },
    actions: {
      A: "Salsa terus menghindari Rani dan mengerjakan proyek berikutnya sendiri.",
      B: "Salsa membalas Rani dengan sindiran di depan teman-teman.",
      C: "Salsa mengajak Rani berbicara secara pribadi, menyampaikan perasaannya dengan tenang, mendengarkan penjelasan Rani, dan menyepakati pembagian tugas."
    },
    starters: {
      l1: [
        "Salsa dan Rani bermasalah karena ...",
        "Pemicunya adalah saat ...",
        "Akibatnya, hubungan mereka ... dan proyek berikutnya ..."
      ],
      l2: {
        thought: "Mungkin {name} berpikir bahwa ...",
        feeling: "Mungkin ia merasa ... karena ...",
        need: "Ia membutuhkan ..."
      },
      l4: "Saat ... aku merasa ... karena ... aku berharap ..."
    },
    feedback: {
      keywords: {
        safe: ["pribadi", "berdua", "tenang", "baik-baik"],
        fair: ["bagi", "sama", "adil", "sepakat", "kedua"],
        realistic: ["istirahat", "pulang sekolah", "besok", "minggu", "setelah"],
        responsibility: ["bicara", "dengar", "jelaskan", "tugas", "tanggung jawab", "minta maaf"],
        humiliating: ["sindir", "ejek", "permalukan", "depan teman", "marah-marah"],
        time: ["hari", "besok", "pagi", "siang", "sore", "malam", "minggu", "setelah", "pulang", "istirahat"]
      }
    }
  };
})();
