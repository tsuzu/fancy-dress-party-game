// ゲーム状態管理
const gameState = {
    currentQuestionIndex: 0,
    score: 0,
    totalQuestions: 0,
    questions: [],
    player: null,
    isPlaying: false,
    hasAnswered: false
};

// DOM要素
const elements = {
    // 画面
    startScreen: document.getElementById('start-screen'),
    gameScreen: document.getElementById('game-screen'),
    resultScreen: document.getElementById('result-screen'),

    // スタート画面
    startButton: document.getElementById('start-button'),

    // ゲーム画面
    scoreDisplay: document.getElementById('score'),
    totalQuestionsDisplay: document.getElementById('total-questions'),
    currentQuestionDisplay: document.getElementById('current-question'),
    totalQuestionsProgressDisplay: document.getElementById('total-questions-progress'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    playPauseBtn: document.getElementById('play-pause-btn'),
    feedbackContainer: document.getElementById('feedback-container'),
    feedbackMessage: document.getElementById('feedback-message'),
    feedbackDetails: document.getElementById('feedback-details'),
    nextButton: document.getElementById('next-button'),

    // 結果画面
    finalScore: document.getElementById('final-score'),
    finalTotal: document.getElementById('final-total'),
    accuracy: document.getElementById('accuracy'),
    resultMessage: document.getElementById('result-message'),
    restartButton: document.getElementById('restart-button'),
    shareButton: document.getElementById('share-button')
};

// 配列をシャッフルする関数（Fisher-Yatesアルゴリズム）
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ランダムな選択肢を生成する
function generateOptions(correctAnswer, allAnswers, count = 4) {
    // 正解以外の選択肢を取得
    const wrongAnswers = allAnswers.filter(answer => answer !== correctAnswer);

    // ランダムに3つの不正解を選択
    const shuffledWrong = shuffleArray(wrongAnswers);
    const selectedWrong = shuffledWrong.slice(0, count - 1);

    // 正解と不正解を組み合わせてシャッフル
    const options = shuffleArray([correctAnswer, ...selectedWrong]);

    return options;
}

// 問題データの読み込み
async function loadQuestions() {
    try {
        const response = await fetch('data/questions.json');
        const data = await response.json();

        // 全ての問題からユニークな回答者リストを作成
        const allAnswers = [...new Set(data.questions.map(q => q.correctAnswer))];

        // 各問題に選択肢を生成
        gameState.questions = data.questions.map(question => {
            const options = generateOptions(question.correctAnswer, allAnswers, 4);
            const correctAnswerIndex = options.indexOf(question.correctAnswer);

            return {
                ...question,
                options: options,
                correctAnswerIndex: correctAnswerIndex
            };
        });

        // 問題をシャッフル
        gameState.questions = shuffleArray(gameState.questions);
        gameState.totalQuestions = gameState.questions.length;

        return true;
    } catch (error) {
        console.error('問題データの読み込みに失敗しました:', error);
        alert('問題データの読み込みに失敗しました。questions.jsonファイルを確認してください。');
        return false;
    }
}

// YouTube IFrame APIの準備完了時に呼ばれる
function onYouTubeIframeAPIReady() {
    console.log('YouTube API準備完了');
}

// YouTube Playerの初期化
function initYouTubePlayer(videoId, startTime = 0) {
    if (gameState.player) {
        gameState.player.loadVideoById({
            videoId: videoId,
            startSeconds: startTime
        });
    } else {
        gameState.player = new YT.Player('youtube-player', {
            height: '360',
            width: '640',
            videoId: videoId,
            playerVars: {
                autoplay: 1,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                iv_load_policy: 3,
                start: startTime
            },
            events: {
                onReady: onPlayerReady,
                onStateChange: onPlayerStateChange
            }
        });
    }
}

// プレーヤー準備完了時
function onPlayerReady(event) {
    console.log('プレーヤー準備完了');
    gameState.isPlaying = true;
    updatePlayPauseButton();
}

// プレーヤー状態変更時
function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        gameState.isPlaying = true;
    } else {
        gameState.isPlaying = false;
    }
    updatePlayPauseButton();
}

// 再生/一時停止ボタンの更新
function updatePlayPauseButton() {
    if (gameState.isPlaying) {
        elements.playPauseBtn.textContent = '⏸ 一時停止';
    } else {
        elements.playPauseBtn.textContent = '▶ 再生';
    }
}

// 画面遷移
function showScreen(screenName) {
    elements.startScreen.classList.remove('active');
    elements.gameScreen.classList.remove('active');
    elements.resultScreen.classList.remove('active');

    switch (screenName) {
        case 'start':
            elements.startScreen.classList.add('active');
            break;
        case 'game':
            elements.gameScreen.classList.add('active');
            break;
        case 'result':
            elements.resultScreen.classList.add('active');
            break;
    }
}

// ゲーム開始
async function startGame() {
    const loaded = await loadQuestions();
    if (!loaded) return;

    // ゲーム状態のリセット
    gameState.currentQuestionIndex = 0;
    gameState.score = 0;
    gameState.hasAnswered = false;

    // UI更新
    elements.scoreDisplay.textContent = '0';
    elements.totalQuestionsDisplay.textContent = gameState.totalQuestions;
    elements.totalQuestionsProgressDisplay.textContent = gameState.totalQuestions;

    showScreen('game');
    loadQuestion();
}

// 問題の読み込み
function loadQuestion() {
    const question = gameState.questions[gameState.currentQuestionIndex];
    gameState.hasAnswered = false;

    // UI更新
    elements.currentQuestionDisplay.textContent = gameState.currentQuestionIndex + 1;
    elements.questionText.textContent = question.question;
    elements.feedbackContainer.classList.add('hidden');

    // 選択肢の生成
    elements.optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.addEventListener('click', () => selectAnswer(index));
        elements.optionsContainer.appendChild(button);
    });

    // YouTube動画の読み込み
    initYouTubePlayer(question.videoId, question.startTime || 0);
}

// 回答選択
function selectAnswer(selectedIndex) {
    if (gameState.hasAnswered) return;

    gameState.hasAnswered = true;
    const question = gameState.questions[gameState.currentQuestionIndex];
    const isCorrect = selectedIndex === question.correctAnswerIndex;

    // 選択肢のボタンを無効化
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach((btn, index) => {
        btn.disabled = true;

        if (index === question.correctAnswerIndex) {
            btn.classList.add('correct');
        } else if (index === selectedIndex && !isCorrect) {
            btn.classList.add('incorrect');
        }
    });

    // スコア更新
    if (isCorrect) {
        gameState.score++;
        elements.scoreDisplay.textContent = gameState.score;
    }

    // フィードバック表示
    showFeedback(isCorrect, question);
}

// フィードバック表示
function showFeedback(isCorrect, question) {
    elements.feedbackContainer.classList.remove('hidden');

    // メッセージ
    elements.feedbackMessage.className = 'feedback-message';
    if (isCorrect) {
        elements.feedbackMessage.classList.add('correct');
        elements.feedbackMessage.textContent = '🎉 正解！';
    } else {
        elements.feedbackMessage.classList.add('incorrect');
        elements.feedbackMessage.textContent = '❌ 不正解...';
    }

    // 詳細情報
    const correctAnswer = question.options[question.correctAnswerIndex];
    let detailsHTML = `<strong>正解: ${correctAnswer}</strong>`;

    // 動画リンクを追加
    if (question.videoId && question.videoTitle) {
        const videoUrl = `https://www.youtube.com/watch?v=${question.videoId}`;
        detailsHTML += `<br><br>📺 <a href="${videoUrl}" target="_blank" rel="noopener noreferrer">${question.videoTitle}</a>`;
    }

    if (question.songTitle) {
        detailsHTML += `<br>曲名: ${question.songTitle}`;
    }

    if (question.originalArtist) {
        detailsHTML += `<br>原曲: ${question.originalArtist}`;
    }

    if (question.explanation) {
        detailsHTML += `<br><br>${question.explanation}`;
    }

    elements.feedbackDetails.innerHTML = detailsHTML;
}

// 次の問題へ
function nextQuestion() {
    gameState.currentQuestionIndex++;

    if (gameState.currentQuestionIndex < gameState.totalQuestions) {
        loadQuestion();
    } else {
        showResults();
    }
}

// 結果表示
function showResults() {
    // 動画を停止
    if (gameState.player) {
        gameState.player.stopVideo();
    }

    // スコア計算
    const accuracy = Math.round((gameState.score / gameState.totalQuestions) * 100);

    // UI更新
    elements.finalScore.textContent = gameState.score;
    elements.finalTotal.textContent = gameState.totalQuestions;
    elements.accuracy.textContent = accuracy;

    // メッセージ
    let message = '';
    if (accuracy === 100) {
        message = '完璧です！🎉 全問正解おめでとうございます！';
    } else if (accuracy >= 80) {
        message = '素晴らしい！😊 とても良い結果です！';
    } else if (accuracy >= 60) {
        message = '良い調子です！👍 もう少しで上級者ですね！';
    } else if (accuracy >= 40) {
        message = 'まずまずですね！😊 もう一度チャレンジしてみましょう！';
    } else {
        message = '頑張りましょう！💪 何度でも挑戦できます！';
    }

    elements.resultMessage.textContent = message;
    showScreen('result');
}

// 再生/一時停止
function togglePlayPause() {
    if (!gameState.player) return;

    if (gameState.isPlaying) {
        gameState.player.pauseVideo();
    } else {
        gameState.player.playVideo();
    }
}

// Xでシェア
function shareOnX() {
    const score = gameState.score;
    const total = gameState.totalQuestions;
    const accuracy = Math.round((score / total) * 100);

    // シェアテキストを作成
    const text = `仮装狂騒曲当てゲームで${total}問中${score}問正解！正解率${accuracy}%でした！🎵\n#仮装狂騒曲当てゲーム`;

    // 現在のページURLを取得
    const url = window.location.href;

    // X（旧Twitter）のシェアURL
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

    // 新しいウィンドウで開く
    window.open(shareUrl, '_blank', 'width=550,height=420');
}

// イベントリスナーの設定
function setupEventListeners() {
    elements.startButton.addEventListener('click', startGame);
    elements.playPauseBtn.addEventListener('click', togglePlayPause);
    elements.nextButton.addEventListener('click', nextQuestion);
    elements.restartButton.addEventListener('click', () => {
        showScreen('start');
    });
    elements.shareButton.addEventListener('click', shareOnX);
}

// 初期化
function init() {
    setupEventListeners();
    console.log('ゲーム初期化完了');
}

// DOMContentLoaded時に初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
