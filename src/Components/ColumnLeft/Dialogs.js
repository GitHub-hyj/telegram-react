/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import classNames from 'classnames';
import Search from './Search/Search';
import DialogsHeader from './DialogsHeader';
import DialogsList from './DialogsList';
import EditProfile from './Settings/EditProfile';
import Notifications from './Settings/Notifications';
import Settings from './Settings/Settings';
import Contacts from './Contacts';
import Language from './Language';
import PrivacySecurity from './Settings/PrivacySecurity';
import ActiveSessions from './Settings/ActiveSessions';
import UpdatePanel from './UpdatePanel';
import { openChat } from '../../Actions/Client';
import { getArchiveTitle } from '../../Utils/Archive';
import { loadChatsContent } from '../../Utils/File';
import AppStore from '../../Stores/ApplicationStore';
import CacheStore from '../../Stores/CacheStore';
import ChatStore from '../../Stores/ChatStore';
import FileStore from '../../Stores/FileStore';
import TdLibController from '../../Controllers/TdLibController';
import './Dialogs.css';
import { Slide } from '@material-ui/core';

class Dialogs extends Component {
    constructor(props) {
        super(props);

        this.dialogListRef = React.createRef();
        this.archiveListRef = React.createRef();
        this.dialogsHeaderRef = React.createRef();

        const { isChatDetailsVisible } = AppStore;

        this.state = {
            cache: null,

            showArchive: false,
            archiveTitle: null,

            mainItems: [],
            archiveItems: [],

            isChatDetailsVisible,
            openSearch: false,
            openArchive: false,

            searchChatId: 0,
            searchText: null,
            query: null
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        const {
            cache,
            showArchive,
            archiveTitle,
            mainItems,
            archiveItems,
            isChatDetailsVisible,
            openSearch,
            openArchive,
            openSettings,
            openContacts,
            searchChatId,
            searchText
        } = this.state;

        if (nextState.cache !== cache) {
            return true;
        }

        if (nextState.showArchive !== showArchive) {
            return true;
        }

        if (nextState.archiveTitle !== archiveTitle) {
            return true;
        }

        if (nextState.archiveItems !== archiveItems) {
            return true;
        }

        if (nextState.mainItems !== mainItems) {
            return true;
        }

        if (nextState.isChatDetailsVisible !== isChatDetailsVisible) {
            return true;
        }

        if (nextState.openSearch !== openSearch) {
            return true;
        }

        if (nextState.openArchive !== openArchive) {
            return true;
        }

        if (nextState.openSettings !== openSettings) {
            return true;
        }

        if (nextState.openContacts !== openContacts) {
            return true;
        }

        if (nextState.searchChatId !== searchChatId) {
            return true;
        }

        if (nextState.searchText !== searchText) {
            return true;
        }

        return false;
    }

    componentDidMount() {
        this.loadCache();

        AppStore.on('clientUpdateChatDetailsVisibility', this.onClientUpdateChatDetailsVisibility);
        AppStore.on('clientUpdateSearchChat', this.onClientUpdateSearchChat);
        AppStore.on('clientUpdateThemeChange', this.onClientUpdateThemeChange);

        ChatStore.on('updateChatChatList', this.onUpdateChatChatList);

        ChatStore.on('updateChatDraftMessage', this.onUpdateChatOrder);
        ChatStore.on('updateChatIsPinned', this.onUpdateChatOrder);
        ChatStore.on('updateChatIsSponsored', this.onUpdateChatOrder);
        ChatStore.on('updateChatLastMessage', this.onUpdateChatOrder);
        ChatStore.on('updateChatOrder', this.onUpdateChatOrder);

        ChatStore.on('clientUpdateOpenSettings', this.onClientUpdateOpenSettings);
        ChatStore.on('clientUpdateCloseSettings', this.onClientUpdateCloseSettings);
        ChatStore.on('clientUpdateOpenArchive', this.onClientUpdateOpenArchive);
        ChatStore.on('clientUpdateCloseArchive', this.onClientUpdateCloseArchive);
        ChatStore.on('clientUpdateOpenContacts', this.onClientUpdateOpenContacts);
        ChatStore.on('clientUpdateCloseContacts', this.onClientUpdateCloseContacts);
    }

    componentWillUnmount() {
        AppStore.off('clientUpdateChatDetailsVisibility', this.onClientUpdateChatDetailsVisibility);
        AppStore.off('clientUpdateSearchChat', this.onClientUpdateSearchChat);
        AppStore.off('clientUpdateThemeChange', this.onClientUpdateThemeChange);

        ChatStore.off('updateChatChatList', this.onUpdateChatChatList);

        ChatStore.off('updateChatDraftMessage', this.onUpdateChatOrder);
        ChatStore.off('updateChatIsPinned', this.onUpdateChatOrder);
        ChatStore.off('updateChatIsSponsored', this.onUpdateChatOrder);
        ChatStore.off('updateChatLastMessage', this.onUpdateChatOrder);
        ChatStore.off('updateChatOrder', this.onUpdateChatOrder);

        ChatStore.off('clientUpdateOpenSettings', this.onClientUpdateOpenSettings);
        ChatStore.off('clientUpdateCloseSettings', this.onClientUpdateCloseSettings);
        ChatStore.off('clientUpdateOpenArchive', this.onClientUpdateOpenArchive);
        ChatStore.off('clientUpdateCloseArchive', this.onClientUpdateCloseArchive);
        ChatStore.off('clientUpdateOpenContacts', this.onClientUpdateOpenContacts);
        ChatStore.off('clientUpdateCloseContacts', this.onClientUpdateCloseContacts);
    }

    async loadCache() {
        const cache = (await CacheStore.loadCache()) || {};

        const { chats, archiveChats } = cache;

        this.setState({
            cache,

            showArchive: archiveChats && archiveChats.length > 0,
            archiveTitle: getArchiveTitle()
        });

        this.loadChatContents((chats || []).map(x => x.id));

        TdLibController.clientUpdate({
            '@type': 'clientUpdateCacheLoaded'
        });
    }

    saveCache() {
        const { current: archiveCurrent } = this.archiveListRef;
        const archiveChatIds =
            archiveCurrent && archiveCurrent.state.chats ? archiveCurrent.state.chats.slice(0, 25) : [];

        const { current: mainCurrent } = this.dialogListRef;
        const mainChatIds = mainCurrent && mainCurrent.state.chats ? mainCurrent.state.chats.slice(0, 25) : [];

        CacheStore.saveChats(mainChatIds, archiveChatIds);
    }

    onUpdateChatOrder = update => {
        const { chat_id } = update;

        const { current: mainCurrent } = this.dialogListRef;
        if (mainCurrent && mainCurrent.loading) {
            return;
        }

        const { current: archiveCurrent } = this.archiveListRef;
        if (archiveCurrent && archiveCurrent.loading) {
            return;
        }

        const archive = ChatStore.chatList.get('chatListArchive');
        if (archive && archive.has(chat_id)) {
            this.setState({ archiveTitle: getArchiveTitle() });
        }
    };

    onUpdateChatChatList = update => {
        const { showArchive: prevShowArchive } = this.state;

        const { current: mainCurrent } = this.dialogListRef;
        if (mainCurrent && mainCurrent.loading) {
            return;
        }

        const { current: archiveCurrent } = this.archiveListRef;
        if (archiveCurrent && archiveCurrent.loading) {
            return;
        }

        const archiveList = ChatStore.chatList.get('chatListArchive');
        const showArchive = archiveList && archiveList.size > 0;

        this.setState({ showArchive, archiveTitle: getArchiveTitle() }, () => {
            if (!prevShowArchive && showArchive) {
                const { current } = this.dialogListRef;
                if (current.listRef) {
                    const { current: listCurrent } = current.listRef;
                    if (listCurrent && listCurrent.scrollTop > 0) {
                        current.scrollTop += 68;
                    }
                }
            }
        });

        if (prevShowArchive && !showArchive) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateCloseArchive'
            });
        }
    };

    onClientUpdateOpenContacts = async update => {
        this.setState({ openContacts: true });
    };

    onClientUpdateCloseContacts = update => {
        this.setState({ openContacts: false });
    };

    onClientUpdateOpenSettings = update => {
        this.setState({ openSettings: true, meChatId: update.chatId });
    };

    onClientUpdateCloseSettings = update => {
        this.setState({ openSettings: false });
    };

    onClientUpdateOpenArchive = update => {
        this.setState({ openArchive: true });
    };

    onClientUpdateCloseArchive = update => {
        this.setState({ openArchive: false });
    };

    onClientUpdateThemeChange = update => {
        this.forceUpdate();
    };

    onClientUpdateChatDetailsVisibility = update => {
        const { isChatDetailsVisible } = AppStore;

        this.setState({ isChatDetailsVisible });
    };

    onClientUpdateSearchChat = update => {
        const { chatId, query } = update;
        const { openSearch, searchChatId, searchText } = this.state;

        if (openSearch && chatId === searchChatId && query === searchText) {
            return;
        }

        const header = this.dialogsHeaderRef.current;
        this.setState(
            {
                openSearch: true,
                searchChatId: chatId,
                searchText: null,
                openSettings: false,
                openActiveSessions: false,
                openContacts: false
            },
            () => {
                if (header) {
                    header.setInitQuery(query);
                }
            }
        );
    };

    handleHeaderClick = () => {
        const { openArchive } = this.state;
        if (openArchive) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateCloseArchive'
            });
        } else {
            this.dialogListRef.current.scrollToTop();
        }
    };

    handleSearch = visible => {
        this.setState({
            openSearch: visible,
            searchChatId: 0,
            searchText: null
        });
    };

    handleSelectMessage = (chatId, messageId, openSearch) => {
        openChat(chatId, messageId);

        const searchChatId = openSearch ? this.state.searchChatId : 0;
        const searchText = openSearch ? this.state.searchText : null;

        this.setState({
            openSearch: openSearch,
            searchChatId: searchChatId,
            searchText: searchText
        });
    };

    handleClose = () => {
        this.setState({
            openSearch: false,
            searchChatId: 0,
            searchText: null
        });
    };

    handleSearchTextChange = text => {
        this.setState({
            searchText: text,
            query: null
        });
    };

    handleSaveCache = () => {
        this.saveCache();
    };

    loadChatContents(chatIds) {
        const store = FileStore.getStore();
        loadChatsContent(store, chatIds);
    }

    render() {
        const {
            cache,
            showArchive,
            archiveTitle,
            mainItems,
            archiveItems,
            isChatDetailsVisible,
            meChatId,
            openSettings,
            openContacts,
            openArchive,
            openSearch,
            searchChatId,
            searchText
        } = this.state;

        const mainCacheItems = cache ? cache.chats || [] : null;
        const archiveCacheItems = cache ? cache.archiveChats || [] : null;

        return (
            <>
                <div
                    className={classNames('dialogs', {
                        'dialogs-third-column': isChatDetailsVisible
                    })}>
                    <div className='sidebar-page'>
                        <DialogsHeader
                            ref={this.dialogsHeaderRef}
                            openArchive={openArchive}
                            openSearch={openSearch}
                            onClick={this.handleHeaderClick}
                            onSearch={this.handleSearch}
                            onSearchTextChange={this.handleSearchTextChange}
                        />
                        <div className='dialogs-content'>
                            <DialogsList
                                type='chatListMain'
                                ref={this.dialogListRef}
                                cacheItems={mainCacheItems}
                                items={mainItems}
                                showArchive={showArchive}
                                archiveTitle={archiveTitle}
                                open={true}
                                onSaveCache={this.handleSaveCache}
                            />
                            <DialogsList
                                type='chatListArchive'
                                ref={this.archiveListRef}
                                cacheItems={archiveCacheItems}
                                items={archiveItems}
                                open={openArchive}
                                onSaveCache={this.handleSaveCache}
                            />
                            {openSearch && (
                                <Search
                                    chatId={searchChatId}
                                    text={searchText}
                                    onSelectMessage={this.handleSelectMessage}
                                    onClose={this.handleClose}
                                />
                            )}
                        </div>
                        <UpdatePanel />
                    </div>

                    <Slide direction='right' in={openContacts} mountOnEnter unmountOnExit>
                        <Contacts />
                    </Slide>

                    <Slide direction='right' in={openSettings} mountOnEnter unmountOnExit>
                        <Settings chatId={meChatId} />
                    </Slide>
                </div>
            </>
        );
    }
}

export default Dialogs;
